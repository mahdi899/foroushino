<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Support\Facades\File;
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
        $adapter = $disk->getAdapter();
        if (method_exists($adapter, 'getPathPrefix') || method_exists($disk, 'path')) {
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

    private static function guardFlysystemPath(Filesystem $disk, string $relativePath): void
    {
        $relativePath = str_replace('\\', '/', trim($relativePath, '/'));
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
            $indexPath = $current.'/index.html';

            try {
                if (! $disk->exists($indexPath)) {
                    $disk->put($indexPath, self::indexContents());
                }
            } catch (\Throwable) {
                // Best effort — remote hosts may reject tiny placeholder files.
            }
        }
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
