<?php

namespace App\Services\Media;

use App\Models\Media;
use App\Support\LegacyMediaMap;
use App\Support\MediaFtpConnection;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Two-way file management against the media library's download host
 * (FTP or SFTP), driven by the panel-managed connection in
 * `App\Support\MediaFtpConnection`. Every transfer streams through a
 * `.part` staging path and is renamed into place only after the remote
 * copy's size is verified against the source — a partial/failed transfer
 * never leaves a half-written file at the final path.
 */
class FtpMediaManager
{
    private const LOCAL_DISK = 'public';

    private const LIST_CACHE_TTL_SECONDS = 20;

    public function isConfigured(): bool
    {
        return filled(config('filesystems.disks.'.$this->remoteDiskName().'.host'));
    }

    public function remoteDiskName(): string
    {
        return MediaFtpConnection::diskName();
    }

    /**
     * Non-recursive directory listing for a single path — deliberately
     * avoids walking the whole tree (which would be a serious bottleneck
     * over FTP/SFTP) and avoids per-file size lookups; call
     * `remoteFileSize()` only for the one file the admin actually needs.
     *
     * @return array{path: string, directories: array<int, array{name: string, path: string}>, files: array<int, array{name: string, path: string}>}
     */
    public function listRemote(string $path = ''): array
    {
        $path = trim($path, '/');
        $cacheKey = 'media.ftp.list.'.$this->remoteDiskName().'.'.md5($path);

        return Cache::remember($cacheKey, self::LIST_CACHE_TTL_SECONDS, function () use ($path): array {
            $disk = $this->remoteDisk();

            $directories = array_map(
                static fn (string $dir): array => ['name' => basename($dir), 'path' => $dir],
                $disk->directories($path),
            );

            $files = array_map(
                static fn (string $file): array => ['name' => basename($file), 'path' => $file],
                $disk->files($path),
            );

            sort($directories);

            return [
                'path' => $path,
                'directories' => $directories,
                'files' => $files,
            ];
        });
    }

    public function remoteFileSize(string $path): ?int
    {
        try {
            return $this->remoteDisk()->size($path);
        } catch (\Throwable) {
            return null;
        }
    }

    public function testConnection(): array
    {
        if (! $this->isConfigured()) {
            return ['ok' => false, 'message' => 'اتصال هاست دانلود پیکربندی نشده است.'];
        }

        try {
            $this->remoteDisk()->directories('');

            return ['ok' => true, 'message' => 'اتصال به هاست دانلود برقرار است.'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'اتصال به هاست دانلود ناموفق بود: '.$this->safeMessage($e)];
        }
    }

    /** Move a locally stored media file to the download host, then remove the local copy. */
    public function push(Media $media): Media
    {
        if ($media->disk !== self::LOCAL_DISK && $media->disk !== 'local') {
            throw new RuntimeException('این فایل هم‌اکنون روی سرور محلی نیست.');
        }

        $local = Storage::disk($media->disk);
        if (! $local->exists($media->path)) {
            throw new RuntimeException('فایل محلی یافت نشد.');
        }

        $remote = $this->remoteDisk();
        $remoteDiskName = $this->remoteDiskName();
        $partPath = $media->path.'.part';

        $stream = $local->readStream($media->path);
        if (! is_resource($stream)) {
            throw new RuntimeException('امکان خواندن فایل محلی وجود ندارد.');
        }

        try {
            $remote->writeStream($partPath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        $localSize = $local->size($media->path);
        $remoteSize = $remote->size($partPath);

        if ($remoteSize !== $localSize) {
            $this->safeDelete($remote, $partPath);

            throw new RuntimeException('اندازه فایل منتقل‌شده با فایل اصلی مطابقت ندارد؛ انتقال لغو شد.');
        }

        $this->finalizeTransfer($remote, $partPath, $media->path);

        $local->delete($media->path);

        $media->update(['disk' => $remoteDiskName]);
        $this->forgetListingCache($media->path);
        LegacyMediaMap::flush();

        return $media->refresh();
    }

    /** Download a file from the download host back onto the local `public` disk. */
    public function pull(Media $media): Media
    {
        $remoteDiskName = $this->remoteDiskName();

        if ($media->disk !== $remoteDiskName) {
            throw new RuntimeException('این فایل روی هاست دانلود نیست.');
        }

        $remote = $this->remoteDisk();
        if (! $remote->exists($media->path)) {
            throw new RuntimeException('فایل روی هاست دانلود یافت نشد.');
        }

        $local = Storage::disk(self::LOCAL_DISK);
        $partPath = $media->path.'.part';

        $stream = $remote->readStream($media->path);
        if (! is_resource($stream)) {
            throw new RuntimeException('امکان خواندن فایل از هاست دانلود وجود ندارد.');
        }

        try {
            $local->writeStream($partPath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        $remoteSize = $remote->size($media->path);
        $localSize = $local->size($partPath);

        if ($remoteSize !== $localSize) {
            $this->safeDelete($local, $partPath);

            throw new RuntimeException('اندازه فایل بازگردانده‌شده مطابقت ندارد؛ عملیات لغو شد.');
        }

        $this->finalizeTransfer($local, $partPath, $media->path);

        $media->update(['disk' => self::LOCAL_DISK]);
        LegacyMediaMap::flush();

        return $media->refresh();
    }

    /** Delete an arbitrary path from the download host — used for DB-tracked media and orphan cleanup alike. */
    public function deleteRemote(string $path): bool
    {
        $remote = $this->remoteDisk();

        if (! $remote->exists($path)) {
            return false;
        }

        $remote->delete($path);
        $this->forgetListingCache($path);

        return true;
    }

    private function remoteDisk(): Filesystem
    {
        $diskName = $this->remoteDiskName();

        if (! filled(config("filesystems.disks.{$diskName}.host"))) {
            throw new RuntimeException('اتصال هاست دانلود پیکربندی نشده است.');
        }

        return Storage::disk($diskName);
    }

    private function finalizeTransfer(Filesystem $disk, string $partPath, string $finalPath): void
    {
        if (method_exists($disk, 'move')) {
            $disk->move($partPath, $finalPath);

            return;
        }

        $disk->copy($partPath, $finalPath);
        $disk->delete($partPath);
    }

    private function safeDelete(Filesystem $disk, string $path): void
    {
        try {
            $disk->delete($path);
        } catch (\Throwable) {
            // Best effort — nothing meaningful to recover from here.
        }
    }

    private function forgetListingCache(string $path): void
    {
        $directory = trim(dirname($path), '.');
        Cache::forget('media.ftp.list.'.$this->remoteDiskName().'.'.md5(trim($directory, '/')));
    }

    /** Never surface raw driver exception text (may contain host/paths) — return a generic reason instead. */
    private function safeMessage(\Throwable $e): string
    {
        return 'بررسی کنید Host، Username، Password و Port درست وارد شده باشند.';
    }
}
