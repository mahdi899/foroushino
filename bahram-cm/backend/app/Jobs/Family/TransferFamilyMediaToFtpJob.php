<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyImageProcessor;
use App\Services\Family\FamilyMediaSettingsService;
use App\Support\FamilyMediaPath;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class TransferFamilyMediaToFtpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $backoff = 60;

    public int $timeout = 600;

    public function __construct(public int $mediaId) {}

    public function handle(FamilyImageProcessor $imageProcessor, FamilyMediaSettingsService $settings): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media) {
            return;
        }

        if ($media->status === FamilyMediaStatus::Ready) {
            return;
        }

        if (! $media->temp_path || ! Storage::disk(config('family.media.temp_disk', 'local'))->exists($media->temp_path)) {
            $media->update([
                'status' => FamilyMediaStatus::Failed,
                'failure_reason' => 'Temporary file missing',
            ]);

            return;
        }

        $media->update(['status' => FamilyMediaStatus::Transferring]);

        $type = $media->type?->value ?? 'voice';
        $diskName = $settings->uploadDisk();
        $tempDisk = Storage::disk(config('family.media.temp_disk', 'local'));

        $extension = pathinfo($media->original_filename ?? 'file.bin', PATHINFO_EXTENSION) ?: 'bin';
        $uploadAbsolute = $tempDisk->path($media->temp_path);
        $meta = null;

        if ($type === FamilyMediaType::Image->value && is_string($uploadAbsolute)) {
            $meta = $imageProcessor->prepare($media, $media->temp_path);
            $uploadAbsolute = $meta['absolute_path'];
            $extension = $meta['extension'];
        }

        $storagePath = FamilyMediaPath::objectKey($type, $extension);
        $partPath = $storagePath.'.part';

        $stream = fopen($uploadAbsolute, 'rb');
        if ($stream === false) {
            $media->update([
                'status' => FamilyMediaStatus::Failed,
                'failure_reason' => 'Unable to read temporary file',
            ]);

            return;
        }

        try {
            $ftp = Storage::disk($diskName);
            $ftp->writeStream($partPath, $stream);

            if (is_resource($stream)) {
                fclose($stream);
            }

            if (method_exists($ftp, 'move')) {
                $ftp->move($partPath, $storagePath);
            } else {
                $ftp->copy($partPath, $storagePath);
                $ftp->delete($partPath);
            }

            $media->update([
                'storage_path' => $storagePath,
                'disk' => $diskName,
                'status' => FamilyMediaStatus::Processing,
                'failure_reason' => null,
                ...(is_array($meta) ? [
                    'mime_type' => $meta['mime_type'],
                    'size' => $meta['size'],
                    'width' => $meta['width'],
                    'height' => $meta['height'],
                ] : []),
            ]);

            if ($type === 'voice') {
                GenerateFamilyWaveformJob::dispatch($media->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            } elseif ($type === 'video') {
                ProcessFamilyVideoJob::dispatch($media->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            } else {
                $updates = ['status' => FamilyMediaStatus::Ready];
                if (! is_array($meta)) {
                    $absolute = $tempDisk->path($media->temp_path);
                    $dims = is_string($absolute) ? @getimagesize($absolute) : false;
                    if (is_array($dims)) {
                        $updates['width'] = (int) $dims[0];
                        $updates['height'] = (int) $dims[1];
                    }
                }
                $media->update($updates);
                CleanupFamilyTemporaryMediaJob::dispatch($media->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            }
        } catch (\Throwable $e) {
            Log::warning('Family FTP transfer failed', [
                'media_id' => $media->id,
                'error' => $e->getMessage(),
            ]);

            try {
                Storage::disk($diskName)->delete($partPath);
            } catch (\Throwable) {
            }

            $media->update([
                'status' => FamilyMediaStatus::Failed,
                'failure_reason' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
