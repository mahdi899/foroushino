<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\FamilyMedia;
use App\Services\Family\FamilyImageProcessor;
use App\Services\Family\FamilyMediaSettingsService;
use App\Support\FamilyBlurPreview;
use App\Support\FamilyMediaStorage;
use App\Support\FamilyMediaPath;
use App\Support\DirectoryListingGuard;
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
        $ftpEnabled = $settings->ftpUploadEnabled();
        $remoteDisk = $ftpEnabled ? $settings->uploadDisk() : 'public';

        if ($remoteDisk !== 'public') {
            $this->storeOnDisk($media, $remoteDisk, $uploadAbsolute, $storagePath, $meta, $type, $tempDisk);

            return;
        }

        $this->storeOnDisk($media, 'public', $uploadAbsolute, $storagePath, $meta, $type, $tempDisk);
    }

    public function failed(?\Throwable $exception): void
    {
        $media = FamilyMedia::query()->find($this->mediaId);
        if (! $media) {
            return;
        }

        Log::error('Family media FTP transfer exhausted retries', [
            'media_id' => $media->id,
            'temp_path' => $media->temp_path,
            'error' => $exception?->getMessage(),
        ]);

        if ($media->status !== FamilyMediaStatus::Ready) {
            $media->update([
                'status' => FamilyMediaStatus::Failed,
                'failure_reason' => $exception?->getMessage() ?? 'FTP transfer failed after retries',
            ]);
        }
    }

  /**
   * @param  array{absolute_path: string, extension: string, mime_type: string, size: int, width: ?int, height: ?int}|null  $meta
   */
    private function storeOnDisk(
        FamilyMedia $media,
        string $diskName,
        string $uploadAbsolute,
        string $storagePath,
        ?array $meta,
        string $type,
        \Illuminate\Contracts\Filesystem\Filesystem $tempDisk,
    ): void {
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
            $target = Storage::disk($diskName);
            $target->writeStream($partPath, $stream);

            if (is_resource($stream)) {
                fclose($stream);
            }

            $localSize = filesize($uploadAbsolute) ?: 0;
            $remoteSize = $target->size($partPath);

            if ($localSize > 0 && $remoteSize !== $localSize) {
                $target->delete($partPath);
                throw new \RuntimeException('Remote upload size mismatch.');
            }

            if (method_exists($target, 'move')) {
                $target->move($partPath, $storagePath);
            } else {
                $target->copy($partPath, $storagePath);
                $target->delete($partPath);
            }

            DirectoryListingGuard::guardStoragePath($target, $storagePath);

            if ($diskName !== 'public') {
                FamilyMediaStorage::purgeLocalPaths($storagePath, $media->thumbnail_path);
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
                    if (is_string($absolute)) {
                        $dims = \App\Support\FamilyImageDimensions::fromPath($absolute);
                        if ($dims['width'] !== null) {
                            $updates['width'] = $dims['width'];
                        }
                        if ($dims['height'] !== null) {
                            $updates['height'] = $dims['height'];
                        }
                    }
                }

                $previewPath = $this->storeBlurPreview($target, $uploadAbsolute, $storagePath);
                if ($previewPath !== null) {
                    $updates['thumbnail_path'] = $previewPath;
                }

                $media->update($updates);
                CleanupFamilyTemporaryMediaJob::dispatch($media->id)
                    ->onQueue(config('family.queues.media', 'family-media'));
            }
        } catch (\Throwable $e) {
            if (is_resource($stream)) {
                fclose($stream);
            }

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

    /** Tiny LQIP WebP for image stories/feed — stored beside the canonical object. */
    private function storeBlurPreview(
        \Illuminate\Contracts\Filesystem\Filesystem $target,
        string $sourceAbsolute,
        string $storagePath,
    ): ?string {
        if (! is_file($sourceAbsolute)) {
            return null;
        }

        $tmpPreview = sys_get_temp_dir().DIRECTORY_SEPARATOR.'family-preview-'.uniqid('', true).'.webp';
        try {
            if (! FamilyBlurPreview::generateFromPath($sourceAbsolute, $tmpPreview)) {
                return null;
            }

            $previewRelative = FamilyBlurPreview::relativePathFor($storagePath);
            $bytes = file_get_contents($tmpPreview);
            if ($bytes === false || $bytes === '') {
                return null;
            }

            $target->put($previewRelative, $bytes);

            return $previewRelative;
        } catch (\Throwable) {
            return null;
        } finally {
            if (is_file($tmpPreview)) {
                @unlink($tmpPreview);
            }
        }
    }
}
