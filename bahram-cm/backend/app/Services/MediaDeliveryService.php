<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/** On-the-fly resize + long-cache delivery for public /storage/media assets. */
class MediaDeliveryService
{
    private const MAX_WIDTH = 2560;

    private const MIN_WIDTH = 32;

    /** Widths requested by Next.js image loader — pre-generated on upload/import. */
    public const PREWARM_WIDTHS = [320, 448, 640, 750, 828, 1080, 1200, 1920];

    public function deliver(string $path, ?int $width, int $quality = 85): BinaryFileResponse
    {
        $path = $this->normalizePath($path);
        $disk = Storage::disk(config('bahram.uploads.public_disk', 'public'));

        abort_unless($disk->exists($path), 404);

        $sourcePath = $disk->path($path);
        $sourceMtime = @filemtime($sourcePath) ?: 0;
        $sourceMime = $this->mime($sourcePath);

        if ($width === null || $width <= 0) {
            return $this->fileResponse($sourcePath, $sourceMime);
        }

        if (! $this->isRasterImage($sourceMime)) {
            return $this->fileResponse($sourcePath, $sourceMime);
        }

        $width = min(self::MAX_WIDTH, max(self::MIN_WIDTH, $width));
        $quality = min(95, max(40, $quality));

        [$sourceWidth] = $this->dimensions($sourcePath);
        if ($sourceWidth !== null && $sourceWidth <= $width) {
            return $this->fileResponse($sourcePath, $sourceMime);
        }

        $variantPath = $this->variantPath($path, $width, $quality);
        if ($this->variantIsFresh($variantPath, $sourceMtime)) {
            return $this->fileResponse($variantPath, 'image/webp');
        }

        $lockPath = $variantPath.'.lock';
        $lock = @fopen($lockPath, 'c');

        if ($lock && flock($lock, LOCK_EX | LOCK_NB)) {
            try {
                if (! $this->variantIsFresh($variantPath, $sourceMtime)) {
                    $this->generateVariant($sourcePath, $variantPath, $width, $quality);
                }
            } finally {
                flock($lock, LOCK_UN);
                fclose($lock);
                @unlink($lockPath);
            }

            if (is_file($variantPath)) {
                return $this->fileResponse($variantPath, 'image/webp');
            }
        } elseif ($lock) {
            fclose($lock);
        }

        // Another request is building the variant — serve the original immediately.
        return $this->fileResponse($sourcePath, $sourceMime);
    }

    /** Warm common delivery widths after upload/import (non-blocking best effort). */
    public function prewarmStandardWidths(string $path, int $quality = 85): void
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');
        if ($path === '' || ! str_starts_with($path, 'media/')) {
            return;
        }

        $disk = Storage::disk(config('bahram.uploads.public_disk', 'public'));
        if (! $disk->exists($path)) {
            return;
        }

        $sourcePath = $disk->path($path);
        $sourceMtime = @filemtime($sourcePath) ?: 0;
        $sourceMime = $this->mime($sourcePath);

        if (! $this->isRasterImage($sourceMime)) {
            return;
        }

        [$sourceWidth] = $this->dimensions($sourcePath);
        if ($sourceWidth === null) {
            return;
        }

        foreach (self::PREWARM_WIDTHS as $width) {
            if ($sourceWidth <= $width) {
                continue;
            }

            $variantPath = $this->variantPath($path, $width, $quality);
            if ($this->variantIsFresh($variantPath, $sourceMtime)) {
                continue;
            }

            try {
                $this->generateVariant($sourcePath, $variantPath, $width, $quality);
            } catch (\Throwable) {
                // Best effort — delivery still works on demand.
            }
        }
    }

    private function normalizePath(string $path): string
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');

        if ($path === '' || str_contains($path, '..') || ! str_starts_with($path, 'media/')) {
            abort(404);
        }

        return $path;
    }

    private function variantPath(string $path, int $width, int $quality): string
    {
        $hash = md5($path.'|'.$width.'|'.$quality);

        return storage_path('app/cache/media-variants/'.$hash.'.webp');
    }

    private function variantIsFresh(string $variantPath, int $sourceMtime): bool
    {
        return is_file($variantPath) && (@filemtime($variantPath) ?: 0) >= $sourceMtime;
    }

    private function generateVariant(string $sourcePath, string $destPath, int $width, int $quality): void
    {
        if (! extension_loaded('gd') || ! function_exists('imagecreatetruecolor')) {
            copy($sourcePath, $destPath);

            return;
        }

        $image = $this->loadGdImage($sourcePath);
        if (! $image) {
            copy($sourcePath, $destPath);

            return;
        }

        $sourceWidth = imagesx($image);
        $sourceHeight = imagesy($image);
        $ratio = min($width / $sourceWidth, $width / $sourceHeight, 1);
        $newW = max(1, (int) round($sourceWidth * $ratio));
        $newH = max(1, (int) round($sourceHeight * $ratio));

        if (function_exists('imagescale')) {
            $resized = imagescale($image, $newW, $newH, IMG_BILINEAR_FIXED);
            imagedestroy($image);
            if ($resized === false) {
                copy($sourcePath, $destPath);

                return;
            }
        } else {
            $resized = imagecreatetruecolor($newW, $newH);
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $sourceWidth, $sourceHeight);
            imagedestroy($image);
        }

        File::ensureDirectoryExists(dirname($destPath));

        if (function_exists('imagewebp')) {
            imagewebp($resized, $destPath, $quality);
        } else {
            imagejpeg($resized, $destPath, $quality);
        }

        imagedestroy($resized);
    }

    private function loadGdImage(string $path): \GdImage|false
    {
        $mime = $this->mime($path);

        return match (true) {
            str_contains($mime, 'jpeg') => @imagecreatefromjpeg($path),
            str_contains($mime, 'png') => @imagecreatefrompng($path),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            str_contains($mime, 'gif') => @imagecreatefromgif($path),
            default => false,
        };
    }

    private function isRasterImage(string $mime): bool
    {
        return str_starts_with($mime, 'image/')
            && ! str_contains($mime, 'svg')
            && ! str_contains($mime, 'gif');
    }

    /** @return array{0: ?int, 1: ?int} */
    private function dimensions(string $path): array
    {
        $size = @getimagesize($path);
        if ($size) {
            return [$size[0], $size[1]];
        }

        return [null, null];
    }

    private function mime(string $path): string
    {
        return mime_content_type($path) ?: 'application/octet-stream';
    }

    private function fileResponse(string $path, string $mime): BinaryFileResponse
    {
        $maxAge = (int) config('bahram.media_cache_max_age', 31536000);
        $cacheControl = 'public, max-age='.$maxAge.', immutable';
        $cdnControl = 'public, max-age='.$maxAge.', immutable';

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => $cacheControl,
            'CDN-Cache-Control' => $cdnControl,
        ]);
    }
}
