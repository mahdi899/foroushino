<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class FamilyMediaStorage
{
    private const LOCAL_DISK = 'public';

    /** Remove stale local public copies after the canonical file lives on FTP/CDN. */
    public static function purgeLocalPublicCopy(?string $storagePath): void
    {
        self::purgeLocalPath($storagePath);
    }

    /** @param  string|null  ...$paths */
    public static function purgeLocalPaths(?string ...$paths): void
    {
        foreach ($paths as $path) {
            self::purgeLocalPath($path);
        }
    }

    public static function localPublicCopyExists(?string $path): bool
    {
        if (! self::isOriginMirrorPath($path)) {
            return false;
        }

        try {
            return Storage::disk(self::LOCAL_DISK)->exists($path);
        } catch (\Throwable) {
            return false;
        }
    }

    public static function isOriginMirrorPath(?string $path): bool
    {
        if (! filled($path)) {
            return false;
        }

        $path = ltrim(str_replace('\\', '/', $path), '/');

        return str_starts_with($path, 'media/family/') || str_starts_with($path, 'media/site/');
    }

    /** Stream a remote object to a local temp file without loading it all into RAM. */
    public static function downloadToTemp(
        \Illuminate\Contracts\Filesystem\Filesystem $disk,
        string $remotePath,
        string $localPath,
    ): bool {
        $stream = $disk->readStream($remotePath);
        if ($stream === false || $stream === null) {
            return false;
        }

        $out = fopen($localPath, 'wb');
        if ($out === false) {
            if (is_resource($stream)) {
                fclose($stream);
            }

            return false;
        }

        try {
            $copied = stream_copy_to_stream($stream, $out);

            return $copied !== false && is_file($localPath) && filesize($localPath) > 0;
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            if (is_resource($out)) {
                fclose($out);
            }
        }
    }

    private static function purgeLocalPath(?string $path): void
    {
        if (! self::isOriginMirrorPath($path)) {
            return;
        }

        try {
            Storage::disk(self::LOCAL_DISK)->delete($path);
        } catch (\Throwable) {
            // Best effort — remote copy is canonical.
        }
    }
}
