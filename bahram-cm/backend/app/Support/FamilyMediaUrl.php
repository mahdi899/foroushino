<?php

namespace App\Support;

final class FamilyMediaUrl
{
    public static function fromPath(?string $storagePath, ?string $disk = null): ?string
    {
        if (! filled($storagePath)) {
            return null;
        }

        if (self::isRemoteDisk($disk)) {
            return self::remoteUrl($storagePath);
        }

        return self::originStorageUrl($storagePath);
    }

    public static function withCacheBuster(?string $url, int|string|null $version): ?string
    {
        if (! filled($url) || $version === null || $version === '') {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'v='.rawurlencode((string) $version);
    }

    /** Files on origin (public disk) — rostami.app/storage, not MEDIA_URL CDN. */
    private static function originStorageUrl(string $storagePath): string
    {
        $origin = rtrim((string) config('bahram.frontend_url', ''), '/');
        if ($origin === '') {
            $origin = rtrim((string) config('app.url'), '/');
        }

        return $origin.'/storage/'.ltrim($storagePath, '/');
    }

    /** FTP / download-host files — cdn.rostami.app when configured. */
    private static function remoteUrl(string $storagePath): string
    {
        $cdn = self::cdnBase();
        if ($cdn !== '') {
            return $cdn.'/'.ltrim($storagePath, '/');
        }

        return self::originStorageUrl($storagePath);
    }

    private static function isRemoteDisk(?string $disk): bool
    {
        return filled($disk) && ! in_array($disk, ['public', 'local'], true);
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
}
