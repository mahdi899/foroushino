<?php

namespace App\Support;

use Illuminate\Support\Str;

/** Same-origin public media URLs under `/storage/...` (never external download hosts). */
final class PublicMediaUrl
{
    public static function forPublicDiskPath(string $path): string
    {
        return '/storage/'.ltrim($path, '/');
    }

    public static function normalize(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }

        if (Str::startsWith($url, '/storage/')) {
            return $url;
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '' && Str::startsWith($url, $appUrl.'/storage/')) {
            return Str::after($url, $appUrl);
        }

        if (preg_match('#^https?://[^/]+(/storage/.+)$#i', $url, $matches) === 1) {
            return $matches[1];
        }

        // External URLs (e.g. Telegram CDN) are not exposed to clients.
        return null;
    }

    public static function publicDiskPath(?string $url): ?string
    {
        $normalized = self::normalize($url);
        if ($normalized === null) {
            return null;
        }

        return Str::after($normalized, '/storage/');
    }
}
