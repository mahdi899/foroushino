<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Support\FamilyMediaUrl;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class TransferFamilyMediaToFtpJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;

    public int $backoff = 60;

    public int $timeout = 600;

    public function __construct(public int $mediaId) {}

    public function handle(): void
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
        $ext = pathinfo($media->original_filename ?? 'file.bin', PATHINFO_EXTENSION) ?: 'bin';
        $ulid = (string) Str::ulid();
        $storagePath = sprintf('family/%s/%s/%s.%s', now()->format('Y/m'), $type, $ulid, $ext);
        $partPath = $storagePath.'.part';

        $diskName = config('family.media.disk', 'family_media_ftp');
        $tempDisk = Storage::disk(config('family.media.temp_disk', 'local'));
        $stream = $tempDisk->readStream($media->temp_path);

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

            // Prefer atomic rename when supported; fallback to copy+delete.
            if (method_exists($ftp, 'move')) {
                $ftp->move($partPath, $storagePath);
            } else {
                $ftp->copy($partPath, $storagePath);
                $ftp->delete($partPath);
            }

            $media->update([
                'storage_path' => $storagePath,
                'status' => FamilyMediaStatus::Processing,
                'failure_reason' => null,
            ]);

            if ($type === 'voice') {
                GenerateFamilyWaveformJob::dispatch($media->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            } elseif ($type === 'video') {
                ProcessFamilyVideoJob::dispatch($media->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            } else {
                $media->update(['status' => FamilyMediaStatus::Ready]);
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
