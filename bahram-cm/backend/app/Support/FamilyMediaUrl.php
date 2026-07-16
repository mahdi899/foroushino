<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class FamilyMediaUrl
{
    public static function fromPath(?string $storagePath): ?string
    {
        if (! filled($storagePath)) {
            return null;
        }

        $cdn = rtrim((string) config('family.media.cdn_url'), '/');
        if ($cdn !== '') {
            return $cdn.'/'.ltrim($storagePath, '/');
        }

        if (FamilyMediaPath::isLibraryPath($storagePath)) {
            return self::localReference($storagePath);
        }

        return self::localReference($storagePath);
    }

    public static function withCacheBuster(?string $url, int|string|null $version): ?string
    {
        if (! filled($url) || $version === null || $version === '') {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'v='.rawurlencode((string) $version);
    }

    private static function localReference(string $storagePath): string
    {
        $ref = MediaUrl::fromDiskPath($storagePath);

        return MediaUrl::resolve($ref, absolute: false)
            ?? '/storage/'.ltrim($storagePath, '/');
    }
}
