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
        // Local uses dispatchSync inside the HTTP request (max_execution_time often 30s).
        // Videos need minutes on FTP — lift the cap for this job only.
        if (function_exists('set_time_limit')) {
            @set_time_limit($this->timeout);
        }

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
                'failure_reason' => 'فایل موقت روی سرور پیدا نشد؛ آپلود ناقص مانده یا پاک شده است.',
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

        $reason = $this->humanFailureReason($exception);

        Log::error('Family media FTP transfer exhausted retries', [
            'media_id' => $media->id,
            'temp_path' => $media->temp_path,
            'error' => $exception?->getMessage(),
            'failure_reason' => $reason,
        ]);

        if ($media->status !== FamilyMediaStatus::Ready) {
            $media->update([
                'status' => FamilyMediaStatus::Failed,
                'failure_reason' => $reason,
            ]);
        }
    }

    private function humanFailureReason(?\Throwable $exception): string
    {
        $raw = trim((string) ($exception?->getMessage() ?? ''));
        $lower = strtolower($raw);

        if (str_contains($lower, 'ftp_fput') || str_contains($lower, 'opening binary mode data connection')) {
            return 'انتقال ویدیو/فایل به هاست دانلود روی کانال داده FTP ناموفق بود. Passive FTP یا VPN/فایروال را بررسی کنید.';
        }
        if ($raw === '' || str_contains($lower, 'ftp transfer failed')) {
            return 'انتقال فایل به هاست دانلود پس از چند تلاش ناموفق بود.';
        }
        if (str_contains($lower, 'size mismatch')) {
            return 'حجم فایل روی هاست با فایل موقت یکی نیست (آپلود ناقص). دوباره آپلود کنید.';
        }
        if (str_contains($lower, 'timeout') || str_contains($lower, 'timed out')) {
            return 'زمان انتقال فایل به هاست تمام شد. اینترنت/VPN سرور یا اتصال FTP را بررسی کنید.';
        }
        if (str_contains($lower, 'connection') || str_contains($lower, 'could not connect')) {
            return 'اتصال به هاست دانلود/FTP برقرار نشد.';
        }
        if (preg_match('/[\x{0600}-\x{06FF}]/u', $raw) === 1) {
            return $raw;
        }

        return 'انتقال فایل به هاست دانلود ناموفق بود: '.$raw;
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
                'failure_reason' => 'خواندن فایل موقت روی سرور ممکن نبود. دوباره آپلود کنید.',
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
                $this->dispatchMediaFollowUp(new GenerateFamilyWaveformJob($media->id));
            } elseif ($type === 'video') {
                // Images become Ready in this job; videos need a second pass
                // (ffprobe + poster). Local/testing: run sync so publish does
                // not depend on `queue:work` (QUEUE_CONNECTION=redis otherwise).
                $this->dispatchMediaFollowUp(new ProcessFamilyVideoJob($media->id));
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
                $this->dispatchMediaFollowUp(new CleanupFamilyTemporaryMediaJob($media->id));
            }
        } catch (\Throwable $e) {
            if (is_resource($stream)) {
                fclose($stream);
            }

            try {
                Storage::disk($diskName)->delete($partPath);
            } catch (\Throwable) {
            }

            // Local only: tiny images often succeed over FTP while larger videos
            // die on the PASV data channel. Fall back to public so the manager
            // can finish publish; production keeps failing/retrying on FTP.
            if (
                app()->environment(['local', 'testing'])
                && $diskName !== 'public'
                && $this->looksLikeFtpDataChannelFailure($e)
            ) {
                Log::warning('Family media FTP data channel failed; falling back to public disk (local only)', [
                    'media_id' => $media->id,
                    'error' => $e->getMessage(),
                ]);

                $this->storeOnDisk($media, 'public', $uploadAbsolute, $storagePath, $meta, $type, $tempDisk);

                return;
            }

            // Keep status as transferring/queued while Laravel retries the job.
            // Permanent Failed + Persian reason is written only in failed() after retries are exhausted,
            // so a dead transfer does not keep occupying the media queue as a half-failed item.
            Log::warning('Family media transfer attempt failed; will retry if attempts remain', [
                'media_id' => $media->id,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage(),
            ]);

            throw $e;
        }
    }

    private function looksLikeFtpDataChannelFailure(\Throwable $e): bool
    {
        $lower = strtolower($e->getMessage());

        return str_contains($lower, 'ftp_fput')
            || str_contains($lower, 'opening binary mode data connection')
            || str_contains($lower, 'failed to open data connection')
            || (str_contains($lower, 'ftp') && str_contains($lower, 'timed out'));
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

    /** Local: finish pipeline inside the request; production: family-media queue. */
    private function dispatchMediaFollowUp(object $job): void
    {
        if (app()->environment(['local', 'testing'])) {
            dispatch_sync($job);

            return;
        }

        dispatch($job)->onQueue(config('family.queues.media', 'family-media'));
    }
}
