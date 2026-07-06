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

    public function deliver(string $path, ?int $width, int $quality = 85): BinaryFileResponse
    {
        $path = $this->normalizePath($path);
        $disk = Storage::disk(config('bahram.uploads.public_disk', 'public'));

        abort_unless($disk->exists($path), 404);

        $sourcePath = $disk->path($path);
        $sourceMtime = @filemtime($sourcePath) ?: 0;

        if ($width === null || $width <= 0) {
            return $this->fileResponse($sourcePath, $this->mime($sourcePath));
        }

        $width = min(self::MAX_WIDTH, max(self::MIN_WIDTH, $width));
        $quality = min(95, max(40, $quality));

        [$sourceWidth, $sourceHeight] = $this->dimensions($sourcePath);
        if ($sourceWidth !== null && $sourceWidth <= $width) {
            return $this->fileResponse($sourcePath, $this->mime($sourcePath));
        }

        $variantPath = $this->variantPath($path, $width, $quality);
        if (! is_file($variantPath) || (@filemtime($variantPath) ?: 0) < $sourceMtime) {
            $this->generateVariant($sourcePath, $variantPath, $width, $quality);
        }

        abort_unless(is_file($variantPath), 500, 'Could not generate image variant.');

        return $this->fileResponse($variantPath, 'image/webp');
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

        $resized = imagecreatetruecolor($newW, $newH);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $sourceWidth, $sourceHeight);
        imagedestroy($image);

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

        return response()->file($path, [
            'Content-Type' => $mime,
            'Cache-Control' => 'public, max-age='.$maxAge.', immutable',
        ]);
    }
}
