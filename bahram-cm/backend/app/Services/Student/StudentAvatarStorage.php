<?php

namespace App\Services\Student;

use App\Support\DirectoryListingGuard;
use App\Support\MediaFtpConnection;
use App\Support\MediaUrl;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Stores student profile avatars on the download host (site media FTP/SFTP)
 * under `media/avatars/{userId}/` so CDN URLs resolve via MediaUrl.
 * Falls back to the local public disk when FTP is not configured.
 */
class StudentAvatarStorage
{
    private const LOCAL_DISK = 'public';

    private const MAX_REMOTE_ATTEMPTS = 3;

    /** @var list<string> */
    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

    private const FAILURE_MESSAGE = 'آپلود عکس پروفایل الان ممکن نیست. لطفاً ساعات دیگر دوباره امتحان کنید.';

    /**
     * Store a new avatar and return the portable `/storage/media/avatars/...` reference.
     * Each upload gets a unique object key so CDN/browser caches never reuse an old file.
     */
    public function store(int $userId, UploadedFile $file, ?string $previousReference = null): string
    {
        $extension = $this->normalizedExtension($file);
        $path = $this->objectKey($userId, $extension);
        $preferRemote = MediaFtpConnection::isReady();
        $diskName = $preferRemote ? MediaFtpConnection::diskName() : self::LOCAL_DISK;
        $attempts = $preferRemote ? self::MAX_REMOTE_ATTEMPTS : 1;
        $lastError = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            try {
                $this->writeUploadedFile($diskName, $path, $file);
                $this->assertStoredFile($diskName, $path, $file);
                $lastError = null;
                break;
            } catch (\Throwable $e) {
                $lastError = $e;
                $this->cleanupPartial($diskName, $path);

                Log::warning('Student avatar upload attempt failed', [
                    'user_id' => $userId,
                    'path' => $path,
                    'attempt' => $attempt,
                    'attempts' => $attempts,
                    'disk' => $diskName,
                    'error' => $e->getMessage(),
                ]);

                if ($attempt < $attempts) {
                    usleep(250_000 * $attempt);
                }
            }
        }

        if ($lastError !== null) {
            if ($preferRemote) {
                // Never leave a CDN URL pointing at a file that only exists on the app server.
                Log::error('Student avatar FTP upload failed after retries', [
                    'user_id' => $userId,
                    'path' => $path,
                    'attempts' => $attempts,
                    'error' => $lastError->getMessage(),
                ]);

                throw new RuntimeException(self::FAILURE_MESSAGE, 0, $lastError);
            }

            throw $lastError;
        }

        $reference = MediaUrl::fromDiskPath($path);
        if (! is_string($reference) || $reference === '') {
            throw new RuntimeException('مرجع ذخیره آواتار نامعتبر است.');
        }

        if ($previousReference) {
            $this->deleteReference($previousReference);
        }

        // When remote succeeded, ensure no leftover local copy of the new path.
        if ($diskName !== self::LOCAL_DISK) {
            $this->safeDelete(Storage::disk(self::LOCAL_DISK), $path);
        }

        return $reference;
    }

    /** Push legacy `/storage/avatars/...` files to `media/avatars/...` on the download host. */
    public function migrateLegacyReference(string $reference): ?string
    {
        $ref = MediaUrl::reference($reference);
        if (! is_string($ref) || ! str_starts_with($ref, '/storage/avatars/')) {
            return null;
        }

        $legacyPath = ltrim(substr($ref, strlen('/storage/')), '/');
        $local = Storage::disk(self::LOCAL_DISK);
        if (! $local->exists($legacyPath)) {
            return null;
        }

        $userId = (int) (explode('/', $legacyPath)[1] ?? 0);
        if ($userId < 1) {
            return null;
        }

        $extension = strtolower(pathinfo($legacyPath, PATHINFO_EXTENSION) ?: 'jpg');
        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            $extension = 'jpg';
        }

        $newPath = $this->objectKey($userId, $extension, 'avatar');
        $absolute = $local->path($legacyPath);
        $diskName = $this->targetDiskName();

        $this->writeLocalFile($diskName, $newPath, $absolute);

        if ($diskName !== self::LOCAL_DISK) {
            $this->safeDelete($local, $legacyPath);
            $this->safeDelete($local, $newPath);
        } elseif ($legacyPath !== $newPath) {
            $this->safeDelete($local, $legacyPath);
        }

        return MediaUrl::fromDiskPath($newPath);
    }

    public function deleteReference(?string $reference): void
    {
        $path = $this->diskPathFromReference($reference);
        if ($path === null) {
            return;
        }

        $this->safeDelete(Storage::disk(self::LOCAL_DISK), $path);

        if (MediaFtpConnection::isReady()) {
            try {
                $this->safeDelete(Storage::disk(MediaFtpConnection::diskName()), $path);
            } catch (\Throwable $e) {
                Log::warning('Failed deleting remote student avatar', [
                    'path' => $path,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function objectKey(int $userId, string $extension, ?string $basename = null): string
    {
        $name = $basename ?: (string) Str::ulid();

        return 'media/avatars/'.$userId.'/'.$name.'.'.$extension;
    }

    private function targetDiskName(): string
    {
        return MediaFtpConnection::isReady()
            ? MediaFtpConnection::diskName()
            : self::LOCAL_DISK;
    }

    private function writeUploadedFile(string $diskName, string $path, UploadedFile $file): void
    {
        $absolute = $file->getRealPath();
        if (! is_string($absolute) || $absolute === '' || ! is_file($absolute)) {
            throw new RuntimeException('فایل آواتار قابل خواندن نیست.');
        }

        $this->writeLocalFile($diskName, $path, $absolute);
    }

    private function writeLocalFile(string $diskName, string $path, string $absoluteSource): void
    {
        $partPath = $path.'.part';
        $disk = Storage::disk($diskName);

        $stream = fopen($absoluteSource, 'rb');
        if ($stream === false) {
            throw new RuntimeException('امکان خواندن فایل آواتار وجود ندارد.');
        }

        try {
            $disk->writeStream($partPath, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }

        $localSize = filesize($absoluteSource) ?: 0;
        $remoteSize = $disk->size($partPath);

        if ($localSize > 0 && $remoteSize !== $localSize) {
            $this->safeDelete($disk, $partPath);

            throw new RuntimeException('اندازه فایل آواتار روی هاست دانلود با فایل اصلی مطابقت ندارد.');
        }

        $this->finalizeTransfer($disk, $partPath, $path);
        DirectoryListingGuard::guardStoragePath($disk, $path);
    }

    private function assertStoredFile(string $diskName, string $path, UploadedFile $file): void
    {
        $disk = Storage::disk($diskName);
        if (! $disk->exists($path)) {
            throw new RuntimeException('فایل آواتار پس از آپلود روی هاست دانلود پیدا نشد.');
        }

        $expected = filesize((string) $file->getRealPath()) ?: 0;
        if ($expected < 1) {
            return;
        }

        $actual = $disk->size($path);
        if ($actual !== $expected) {
            $this->safeDelete($disk, $path);

            throw new RuntimeException('اندازه فایل نهایی آواتار با فایل اصلی مطابقت ندارد.');
        }
    }

    private function cleanupPartial(string $diskName, string $path): void
    {
        $disk = Storage::disk($diskName);
        $this->safeDelete($disk, $path);
        $this->safeDelete($disk, $path.'.part');
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

    private function normalizedExtension(UploadedFile $file): string
    {
        $extension = strtolower((string) ($file->getClientOriginalExtension() ?: $file->extension() ?: 'jpg'));
        if ($extension === 'jpeg') {
            $extension = 'jpg';
        }

        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            $extension = 'jpg';
        }

        return $extension;
    }

    private function diskPathFromReference(?string $reference): ?string
    {
        $ref = MediaUrl::reference($reference);
        if (! is_string($ref) || ! str_starts_with($ref, '/storage/')) {
            return null;
        }

        $path = ltrim(substr($ref, strlen('/storage/')), '/');

        // Only touch avatar trees — never delete arbitrary media refs from profile.
        if (
            ! str_starts_with($path, 'media/avatars/')
            && ! str_starts_with($path, 'avatars/')
        ) {
            return null;
        }

        return $path;
    }

    private function safeDelete(Filesystem $disk, string $path): void
    {
        try {
            if ($disk->exists($path)) {
                $disk->delete($path);
            }
        } catch (\Throwable) {
            // Best effort cleanup.
        }
    }
}
