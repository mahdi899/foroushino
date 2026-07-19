<?php

namespace App\Support;

use App\Models\Media;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\File;
use League\Flysystem\Local\LocalFilesystemAdapter;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/** Drop a tiny index.html in public media folders so directory listing stays off. */
final class DirectoryListingGuard
{
    private const INDEX = '<!doctype html><meta charset=utf-8>';

    /** @var list<string> */
    private const PUBLIC_ROOTS = ['media', 'avatars', 'family-demo'];

    public static function indexContents(): string
    {
        return self::INDEX;
    }

    /** Guard every parent directory of a file on the local public disk. */
    public static function guardPublicRelativePath(string $relativePath): void
    {
        self::guardRelativePathChain(self::publicRoot(), $relativePath);
    }

    /** Guard parent directories on any Flysystem disk (local public or FTP/SFTP). */
    public static function guardStoragePath(Filesystem $disk, string $relativePath): void
    {
        if (self::isLocalPublicDisk($disk)) {
            self::guardPublicRelativePath($relativePath);

            return;
        }

        self::guardFlysystemPath($disk, $relativePath);
    }

    /** Ensure index.html exists under every directory beneath the public media roots. */
    public static function backfill(): int
    {
        $created = 0;
        $publicRoot = self::publicRoot();

        foreach (self::PUBLIC_ROOTS as $root) {
            $absoluteRoot = $publicRoot.DIRECTORY_SEPARATOR.$root;
            if (! is_dir($absoluteRoot)) {
                continue;
            }

            $created += self::ensureIndex($absoluteRoot) ? 1 : 0;

            $iterator = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($absoluteRoot, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::SELF_FIRST,
            );

            foreach ($iterator as $item) {
                if ($item->isDir()) {
                    $created += self::ensureIndex($item->getPathname()) ? 1 : 0;
                }
            }
        }

        return $created;
    }

    /** Backfill index.html on a remote download-host disk (FTP/SFTP). */
    public static function backfillRemote(Filesystem $disk): int
    {
        if (self::isLocalPublicDisk($disk)) {
            return 0;
        }

        $created = 0;

        foreach (self::PUBLIC_ROOTS as $root) {
            $created += self::ensureRemoteIndex($disk, $root);
        }

        $paths = Media::query()
            ->whereNotIn('disk', ['public', 'local'])
            ->whereNotNull('path')
            ->pluck('path');

        foreach ($paths as $path) {
            $created += self::guardFlysystemPath($disk, (string) $path);
        }

        return $created;
    }

    private static function isLocalPublicDisk(Filesystem $disk): bool
    {
        if ($disk instanceof FilesystemAdapter) {
            return $disk->getAdapter() instanceof LocalFilesystemAdapter;
        }

        return method_exists($disk->getAdapter(), 'getPathPrefix');
    }

    private static function publicRoot(): string
    {
        return storage_path('app/public');
    }

    private static function guardRelativePathChain(string $absoluteRoot, string $relativePath): void
    {
        $relativePath = str_replace('\\', '/', trim($relativePath, '/'));
        if ($relativePath === '') {
            return;
        }

        $directory = trim(dirname($relativePath), '.');
        if ($directory === '' || $directory === '.') {
            return;
        }

        $parts = explode('/', $directory);
        $current = '';

        foreach ($parts as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }

            $current = $current === '' ? $part : $current.'/'.$part;
            self::ensureIndex($absoluteRoot.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $current));
        }
    }

    private static function guardFlysystemPath(Filesystem $disk, string $relativePath): int
    {
        $relativePath = str_replace('\\', '/', trim($relativePath, '/'));
        $directory = trim(dirname($relativePath), '.');
        if ($directory === '' || $directory === '.') {
            return 0;
        }

        $created = 0;
        $parts = explode('/', $directory);
        $current = '';

        foreach ($parts as $part) {
            if ($part === '' || $part === '.') {
                continue;
            }

            $current = $current === '' ? $part : $current.'/'.$part;
            $created += self::ensureRemoteIndex($disk, $current);
        }

        return $created;
    }

    private static function ensureRemoteIndex(Filesystem $disk, string $directory): int
    {
        $directory = trim(str_replace('\\', '/', $directory), '/');
        $indexPath = $directory === '' ? 'index.html' : $directory.'/index.html';

        try {
            if (! $disk->exists($indexPath)) {
                $disk->put($indexPath, self::indexContents());

                return 1;
            }
        } catch (\Throwable) {
            // Best effort — remote hosts may reject tiny placeholder files.
        }

        return 0;
    }

    private static function ensureIndex(string $absoluteDir): bool
    {
        $indexPath = $absoluteDir.DIRECTORY_SEPARATOR.'index.html';
        if (is_file($indexPath)) {
            return false;
        }

        File::ensureDirectoryExists($absoluteDir);
        File::put($indexPath, self::indexContents());

        return true;
    }
}
