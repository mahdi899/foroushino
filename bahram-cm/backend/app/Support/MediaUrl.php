<?php

namespace App\Support;

use App\Services\MediaHostSettingsService;

/**
 * Single source of truth for public media URLs (/storage, /images, CDN).
 *
 * DB and HTML store portable references via reference().
 * Display, API, and sitemap use resolve().
 *
 * Download host: database/data/media_hosts.json → settings table (see media:sync-hosts).
 */
final class MediaUrl
{
    /** Unified CDN/host for uploads + static /images. Null = split mode (dev default). */
    public static function mediaOrigin(): ?string
    {
        return app(MediaHostSettingsService::class)->mediaUrl();
    }

    /** Laravel /storage origin when MEDIA_URL is unset. */
    public static function uploadOrigin(): string
    {
        if ($origin = self::mediaOrigin()) {
            return $origin;
        }

        $base = rtrim((string) config('bahram.asset_url', config('app.url', 'http://127.0.0.1:8000')), '/');
        if (preg_match('#^https?://localhost$#', $base)) {
            return 'http://127.0.0.1:8000';
        }

        return $base;
    }

    public static function siteOrigin(): string
    {
        return rtrim((string) config('bahram.frontend_url', 'http://localhost:3000'), '/');
    }

    /** CDN delivery path — only download-host gallery assets drop the `/storage` prefix. */
    public static function cdnPathFromStorageRef(string $ref): string
    {
        if (str_starts_with($ref, '/storage/media/')) {
            return substr($ref, strlen('/storage'));
        }

        return $ref;
    }

    public static function usesCdnDelivery(string $ref): bool
    {
        return str_starts_with($ref, '/storage/media/');
    }

    /**
     * Portable path for DB / JSON — never an absolute CDN URL.
     *
     * @return string|null e.g. /storage/articles/x.jpg, /images/hero.webp, https://…
     */
    public static function reference(?string $url): ?string
    {
        if ($url === null || trim($url) === '') {
            return null;
        }

        $url = self::unwrapNextImageProxy(trim($url));
        if ($url === null || $url === '') {
            return null;
        }

        if (str_starts_with($url, '/images/') || str_starts_with($url, '/media/')) {
            $mapped = LegacyMediaMap::resolveStorageReference($url);
            if ($mapped) {
                return $mapped;
            }

            return $url;
        }

        if (str_starts_with($url, '/api/files/')) {
            return '/storage/'.substr($url, strlen('/api/files/'));
        }

        if (str_starts_with($url, '/storage/')) {
            return $url;
        }

        if (preg_match('#^https?://[^/]+(/storage/.+)$#', $url, $m)) {
            return $m[1];
        }

        if (preg_match('#^https?://[^/]+(/images/.+)$#', $url, $m)) {
            return $m[1];
        }

        if (str_starts_with($url, 'http://') || str_starts_with($url, 'https://')) {
            return $url;
        }

        if (str_starts_with($url, '/')) {
            return $url;
        }

        return '/storage/'.ltrim($url, '/');
    }

    /**
     * Public URL for display, sitemap, and crawlers.
     */
    public static function resolve(?string $url, bool $absolute = true): ?string
    {
        $ref = self::reference($url);
        if ($ref === null) {
            return null;
        }

        if (str_starts_with($ref, 'http://') || str_starts_with($ref, 'https://')) {
            return self::normalizeAbsoluteStorage($ref);
        }

        if (! $absolute) {
            return $ref;
        }

        $cdn = self::mediaOrigin();

        if (str_starts_with($ref, '/images/')) {
            $mapped = LegacyMediaMap::resolveStorageReference($ref);
            if ($mapped) {
                $ref = $mapped;
            } else {
                return ($cdn ?? self::siteOrigin()).$ref;
            }
        }

        if (str_starts_with($ref, '/storage/')) {
            $cdn = self::mediaOrigin();
            if ($cdn && self::usesCdnDelivery($ref)) {
                return $cdn.self::cdnPathFromStorageRef($ref);
            }

            return ($cdn ? self::siteOrigin() : self::uploadOrigin()).$ref;
        }

        if (str_starts_with($ref, '/')) {
            return self::siteOrigin().$ref;
        }

        return self::uploadOrigin().'/storage/'.ltrim($ref, '/');
    }

    public static function fromDiskPath(?string $path): ?string
    {
        if ($path === null || trim($path) === '') {
            return null;
        }

        $normalized = trim($path);

        if (str_starts_with($normalized, '/storage/')) {
            return self::reference($normalized);
        }

        if (str_starts_with($normalized, 'storage/')) {
            return self::reference('/'.$normalized);
        }

        return self::reference('/storage/'.ltrim($normalized, '/'));
    }

    private static function normalizeAbsoluteStorage(string $url): string
    {
        if (preg_match('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?(/storage/.+)$#', $url, $m)) {
            return self::uploadOrigin().$m[1];
        }

        $cdn = self::mediaOrigin();
        if ($cdn && preg_match('#^https?://[^/]+(/storage/.+)$#', $url, $m)) {
            $ref = $m[1];

            return self::usesCdnDelivery($ref)
                ? $cdn.self::cdnPathFromStorageRef($ref)
                : self::siteOrigin().$ref;
        }

        if ($cdn && preg_match('#^https?://[^/]+(/images/.+)$#', $url, $m)) {
            return $cdn.$m[1];
        }

        return $url;
    }

    private static function unwrapNextImageProxy(string $url): ?string
    {
        if (! str_contains($url, '_next/image')) {
            return $url;
        }

        $query = parse_url($url, PHP_URL_QUERY);
        if (! is_string($query) || $query === '') {
            return null;
        }

        parse_str($query, $params);
        $inner = isset($params['url']) ? urldecode((string) $params['url']) : null;
        if (! $inner) {
            return null;
        }

        return self::unwrapNextImageProxy($inner);
    }
}
