<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class FamilyMediaUrl
{
    public static function fromPath(?string $storagePath, ?string $disk = null): ?string
    {
        if (! filled($storagePath)) {
            return null;
        }

        if (self::shouldServeLocally($disk, $storagePath)) {
            return self::localReference($storagePath);
        }

        $cdn = self::cdnBase();
        if ($cdn !== '') {
            return $cdn.'/'.ltrim($storagePath, '/');
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

    private static function shouldServeLocally(?string $disk, string $storagePath): bool
    {
        if (in_array($disk, ['public', 'local'], true)) {
            return true;
        }

        try {
            if (Storage::disk('public')->exists($storagePath)) {
                return true;
            }
        } catch (\Throwable) {
            // Fall through to remote/CDN handling.
        }

        if (filled($disk) && ! in_array($disk, ['public', 'local'], true)) {
            return false;
        }

        return true;
    }

    private static function cdnBase(): string
    {
        $cdn = rtrim((string) config('family.media.cdn_url'), '/');
        if ($cdn !== '') {
            return $cdn;
        }

        $mediaUrl = rtrim((string) config('bahram.media_url'), '/');
        if ($mediaUrl !== '') {
            return $mediaUrl;
        }

        $arvan = trim((string) config('bahram.arvan.media_domain', ''));
        if ($arvan !== '') {
            return str_starts_with($arvan, 'http') ? rtrim($arvan, '/') : 'https://'.$arvan;
        }

        return '';
    }

    private static function localReference(string $storagePath): string
    {
        $ref = MediaUrl::fromDiskPath($storagePath);

        return MediaUrl::resolve($ref, absolute: false)
            ?? '/storage/'.ltrim($storagePath, '/');
    }
}
