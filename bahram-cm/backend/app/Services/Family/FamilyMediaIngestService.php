<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Jobs\Family\TransferFamilyMediaToFtpJob;
use App\Models\FamilyMedia;
use App\Models\FamilyMediaUploadSession;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FamilyMediaIngestService
{
    public function __construct(
        private readonly FamilyMediaSettingsService $mediaSettings,
    ) {}

    public function ingestSimple(User $uploader, UploadedFile $file, string $type, ?bool $optimizeImages = null): FamilyMedia
    {
        $mediaType = FamilyMediaType::from($type);
        $this->assertSize($file, $mediaType);

        $tempPath = config('family.media.temp_path', 'family-ingest').'/'.(string) Str::ulid().'.'.$file->getClientOriginalExtension();
        Storage::disk(config('family.media.temp_disk', 'local'))->put($tempPath, file_get_contents($file->getRealPath()));

        $media = FamilyMedia::query()->create([
            'type' => $mediaType,
            'disk' => 'public',
            'temp_path' => $tempPath,
            'original_filename' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType(),
            'optimize_images' => $optimizeImages,
            'size' => $file->getSize(),
            'status' => FamilyMediaStatus::Queued,
            'uploaded_by' => $uploader->id,
        ]);

        TransferFamilyMediaToFtpJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));

        return $media;
    }

    public function createChunkSession(
        User $uploader,
        string $type,
        string $filename,
        int $totalSize,
        int $chunkSize,
        ?string $mime = null,
        ?bool $optimizeImages = null,
    ): FamilyMediaUploadSession {
        $mediaType = FamilyMediaType::from($type);
        $ulid = (string) Str::ulid();
        $tempPath = config('family.media.temp_path', 'family-ingest')."/sessions/{$ulid}.part";
        $totalChunks = (int) ceil($totalSize / max(1, $chunkSize));

        Storage::disk(config('family.media.temp_disk', 'local'))->put($tempPath, '');

        return FamilyMediaUploadSession::query()->create([
            'ulid' => $ulid,
            'uploaded_by' => $uploader->id,
            'type' => $mediaType,
            'original_filename' => $filename,
            'mime_type' => $mime,
            'optimize_images' => $optimizeImages,
            'total_size' => $totalSize,
            'chunk_size' => $chunkSize,
            'total_chunks' => $totalChunks,
            'received_chunks' => 0,
            'temp_path' => $tempPath,
            'status' => 'uploading',
        ]);
    }

    public function appendChunk(FamilyMediaUploadSession $session, int $index, string $binary): FamilyMediaUploadSession
    {
        abort_unless($session->status === 'uploading', 422);
        abort_unless($index >= 0 && $index < $session->total_chunks, 422);

        $disk = Storage::disk(config('family.media.temp_disk', 'local'));
        // Chunks must arrive in order for V1.
        abort_unless($index === (int) $session->received_chunks, 422, 'Chunks must be uploaded in order.');

        // Stream-append — never re-read the entire partial file into PHP memory.
        $absolute = $disk->path($session->temp_path);
        $dir = dirname($absolute);
        if (! is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $handle = fopen($absolute, 'ab');
        abort_unless($handle !== false, 500, 'Cannot open upload session file.');
        try {
            fwrite($handle, $binary);
        } finally {
            fclose($handle);
        }

        $session->increment('received_chunks');

        return $session->fresh();
    }

    public function completeSession(FamilyMediaUploadSession $session): FamilyMedia
    {
        abort_unless((int) $session->received_chunks === (int) $session->total_chunks, 422, 'Upload incomplete.');

        $media = FamilyMedia::query()->create([
            'type' => $session->type,
            'disk' => 'public',
            'temp_path' => $session->temp_path,
            'original_filename' => $session->original_filename,
            'mime_type' => $session->mime_type,
            'optimize_images' => $session->optimize_images,
            'size' => $session->total_size,
            'status' => FamilyMediaStatus::Queued,
            'uploaded_by' => $session->uploaded_by,
        ]);

        $session->update([
            'status' => 'completed',
            'media_id' => $media->id,
        ]);

        TransferFamilyMediaToFtpJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));

        return $media;
    }

    public function retry(FamilyMedia $media): FamilyMedia
    {
        abort_unless($media->status === FamilyMediaStatus::Failed, 422);
        abort_unless(filled($media->temp_path), 422, 'No temporary file to retry.');

        $media->update([
            'status' => FamilyMediaStatus::Queued,
            'failure_reason' => null,
        ]);

        TransferFamilyMediaToFtpJob::dispatch($media->id)
            ->onQueue(config('family.queues.media', 'family-media'));

        return $media->fresh();
    }

    private function assertSize(UploadedFile $file, FamilyMediaType $type): void
    {
        $mb = $file->getSize() / 1024 / 1024;
        $max = match ($type) {
            FamilyMediaType::Voice => (int) config('family.media.max_voice_mb', 50),
            FamilyMediaType::Video => (int) config('family.media.max_video_mb', 500),
            FamilyMediaType::Image => (int) config('family.media.max_image_mb', 15),
        };

        abort_if($mb > $max, 422, "حجم فایل بیش از {$max} مگابایت است.");
    }
}
