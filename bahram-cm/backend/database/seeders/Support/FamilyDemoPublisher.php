<?php

namespace Database\Seeders\Support;

use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyMediaSettingsService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

/**
 * Pushes committed demo binaries to the download host (FTP) when configured,
 * so CDN URLs and the family stream API both resolve the same canonical files.
 */
final class FamilyDemoPublisher
{
    public function publishMediaToDownloadHost(FamilyMedia $media): bool
    {
        $path = $media->storage_path;
        if (! filled($path)) {
            return false;
        }

        $localAbsolute = storage_path('app/public/'.$path);
        if (! is_file($localAbsolute)) {
            Log::warning('Family demo file missing on origin', ['path' => $path]);

            return false;
        }

        $remoteDiskName = app(FamilyMediaSettingsService::class)->uploadDisk();
        if ($remoteDiskName === 'public') {
            $media->update([
                'disk' => 'public',
                'status' => FamilyMediaStatus::Ready,
            ]);

            return true;
        }

        $remote = Storage::disk($remoteDiskName);

        try {
            if (! $remote->exists($path)) {
                $stream = fopen($localAbsolute, 'rb');
                if ($stream === false) {
                    return false;
                }

                try {
                    $remote->writeStream($path, $stream);
                } finally {
                    if (is_resource($stream)) {
                        fclose($stream);
                    }
                }

                $localSize = filesize($localAbsolute) ?: 0;
                $remoteSize = $remote->size($path);
                if ($localSize > 0 && $remoteSize !== $localSize) {
                    $remote->delete($path);
                    throw new \RuntimeException("Demo upload size mismatch for {$path}");
                }
            }

            $media->update([
                'disk' => $remoteDiskName,
                'status' => FamilyMediaStatus::Ready,
                'failure_reason' => null,
            ]);

            return true;
        } catch (\Throwable $e) {
            Log::error('Family demo FTP publish failed', [
                'path' => $path,
                'disk' => $remoteDiskName,
                'error' => $e->getMessage(),
            ]);

            $media->update([
                'disk' => 'public',
                'status' => FamilyMediaStatus::Ready,
                'failure_reason' => null,
            ]);

            return false;
        }
    }

    /**
     * @param  array<string, FamilyMedia>  $assets
     * @return array{uploaded: int, local: int, failed: int}
     */
    public function publishAll(array $assets): array
    {
        $stats = ['uploaded' => 0, 'local' => 0, 'failed' => 0];

        foreach ($assets as $media) {
            $remoteDisk = app(FamilyMediaSettingsService::class)->uploadDisk();
            $ok = $this->publishMediaToDownloadHost($media);
            $media->refresh();

            if (! $ok) {
                $stats['failed']++;
            } elseif ($media->disk === $remoteDisk && $remoteDisk !== 'public') {
                $stats['uploaded']++;
            } else {
                $stats['local']++;
            }
        }

        return $stats;
    }
}
