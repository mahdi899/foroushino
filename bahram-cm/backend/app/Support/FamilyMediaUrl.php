<?php

namespace App\Support;

final class FamilyMediaUrl
{
    public static function fromPath(?string $storagePath): ?string
    {
        if (! filled($storagePath)) {
            return null;
        }

        if (FamilyMediaPath::isLibraryPath($storagePath)) {
            $cdn = rtrim((string) config('family.media.cdn_url'), '/');
            if ($cdn !== '') {
                return $cdn.'/'.ltrim($storagePath, '/');
            }

            return MediaUrl::resolve(MediaUrl::fromDiskPath($storagePath));
        }

        $cdn = rtrim((string) config('family.media.cdn_url'), '/');
        if ($cdn === '') {
            $cdn = rtrim((string) config('app.url'), '/').'/storage';
        }

        return $cdn.'/'.ltrim($storagePath, '/');
    }

    public static function withCacheBuster(?string $url, int|string|null $version): ?string
    {
        if (! filled($url) || $version === null || $version === '') {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'v='.rawurlencode((string) $version);
    }
}
