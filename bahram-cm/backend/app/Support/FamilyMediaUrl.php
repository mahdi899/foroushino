<?php

namespace App\Support;

use App\Services\MediaHostSettingsService;

final class FamilyMediaUrl
{
    public static function fromPath(?string $storagePath, ?string $disk = null): ?string
    {
        if (! filled($storagePath)) {
            return null;
        }

        if (self::isRemoteDisk($disk) || self::shouldDeliverViaCdn($storagePath, $disk)) {
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

    /**
     * Production: gallery paths on public disk still live on the download host —
     * serve via CDN when configured (panel FTP or FAMILY_MEDIA_CDN_URL).
     */
    private static function shouldDeliverViaCdn(string $storagePath, ?string $disk): bool
    {
        if (! in_array($disk, ['public', 'local', null], true)) {
            return false;
        }

        if (self::cdnBase() === '') {
            return false;
        }

        $path = ltrim(str_replace('\\', '/', $storagePath), '/');

        return str_starts_with($path, 'media/family/') || str_starts_with($path, 'media/site/');
    }

    private static function cdnBase(): string
    {
        return app(MediaHostSettingsService::class)->familyMediaCdnUrl() ?? '';
    }
}
