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
            return self::stripQuery($url);
        }

        $appUrl = rtrim((string) config('app.url'), '/');
        if ($appUrl !== '' && Str::startsWith($url, $appUrl.'/storage/')) {
            return self::stripQuery(Str::after($url, $appUrl));
        }

        if (preg_match('#^https?://[^/]+(/storage/.+)$#i', $url, $matches) === 1) {
            return self::stripQuery($matches[1]);
        }

        // External URLs (e.g. Telegram CDN) are not exposed to clients.
        return null;
    }

    /** Append cache-buster so browsers/CDN fetch fresh bytes after avatar upload. */
    public static function withVersion(?string $url, ?\DateTimeInterface $updatedAt = null): ?string
    {
        $normalized = self::normalize($url);
        if ($normalized === null) {
            return null;
        }

        if ($updatedAt === null) {
            return $normalized;
        }

        $version = $updatedAt->getTimestamp();

        return $normalized.(str_contains($normalized, '?') ? '&' : '?').'v='.$version;
    }

    private static function stripQuery(string $path): string
    {
        $q = strpos($path, '?');
        if ($q === false) {
            return $path;
        }

        return substr($path, 0, $q);
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
