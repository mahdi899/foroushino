<?php

namespace App\Support;

/**
 * Tiny blurred WebP (~5KB) for story / feed LQIP — load first, then full media.
 */
final class FamilyBlurPreview
{
    public const TARGET_WIDTH = 48;

    public const WEBP_QUALITY = 40;

    public const MAX_BYTES = 5120;

    public static function relativePathFor(string $storagePath): string
    {
        return preg_replace('/\.[^.]+$/', '', $storagePath).'_preview.webp';
    }

    public static function generateFromPath(string $sourceAbsolute, string $destAbsolute): bool
    {
        if (! is_file($sourceAbsolute) || ! extension_loaded('gd') || ! function_exists('imagecreatetruecolor')) {
            return false;
        }

        $image = self::load($sourceAbsolute);
        if ($image === false) {
            return false;
        }

        $srcW = imagesx($image);
        $srcH = imagesy($image);
        if ($srcW < 1 || $srcH < 1) {
            imagedestroy($image);

            return false;
        }

        $ratio = self::TARGET_WIDTH / $srcW;
        $newW = max(1, (int) round($srcW * $ratio));
        $newH = max(1, (int) round($srcH * $ratio));

        if (function_exists('imagescale')) {
            $resized = imagescale($image, $newW, $newH, IMG_BILINEAR_FIXED);
            imagedestroy($image);
            if ($resized === false) {
                return false;
            }
        } else {
            $resized = imagecreatetruecolor($newW, $newH);
            imagealphablending($resized, false);
            imagesavealpha($resized, true);
            imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $srcW, $srcH);
            imagedestroy($image);
        }

        if (defined('IMG_FILTER_GAUSSIAN_BLUR')) {
            for ($i = 0; $i < 3; $i++) {
                imagefilter($resized, IMG_FILTER_GAUSSIAN_BLUR);
            }
        }

        $dir = dirname($destAbsolute);
        if (! is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }

        $quality = self::WEBP_QUALITY;
        $written = false;

        for ($attempt = 0; $attempt < 4; $attempt++) {
            if (function_exists('imagewebp')) {
                $written = @imagewebp($resized, $destAbsolute, $quality);
            } else {
                $written = @imagejpeg($resized, $destAbsolute, max(20, $quality));
            }

            if (! $written || ! is_file($destAbsolute)) {
                break;
            }

            if (filesize($destAbsolute) <= self::MAX_BYTES || $quality <= 20) {
                break;
            }

            $quality = max(20, $quality - 10);
        }

        imagedestroy($resized);

        return $written && is_file($destAbsolute) && filesize($destAbsolute) > 0;
    }

    private static function load(string $path): \GdImage|false
    {
        $mime = mime_content_type($path) ?: '';

        return match (true) {
            str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => @imagecreatefromjpeg($path),
            str_contains($mime, 'png') => @imagecreatefrompng($path),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            str_contains($mime, 'gif') => @imagecreatefromgif($path),
            default => self::loadByExtension($path),
        };
    }

    private static function loadByExtension(string $path): \GdImage|false
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return match ($ext) {
            'jpg', 'jpeg' => @imagecreatefromjpeg($path),
            'png' => @imagecreatefrompng($path),
            'webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : false,
            'gif' => @imagecreatefromgif($path),
            default => false,
        };
    }
}
