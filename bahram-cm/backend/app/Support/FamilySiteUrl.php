<?php

namespace App\Support;

/**
 * Canonical club (family channel) URLs for in-app notifications and Web Push.
 *
 * Family lives on its own apex (rostami.club / club.lvh.me) — never rostami.app/family.
 */
final class FamilySiteUrl
{
    public static function homeUrl(): string
    {
        return self::clubOrigin().'/';
    }

    public static function postUrl(int $postId): string
    {
        return self::clubOrigin().'/?post='.$postId;
    }

    public static function notificationsUrl(): string
    {
        return self::clubOrigin().'/notifications';
    }

    /** @deprecated Use homeUrl() — kept for legacy callers during transition */
    public static function homePath(): string
    {
        return self::homeUrl();
    }

    /** @deprecated Use postUrl() */
    public static function postPath(int $postId): string
    {
        return self::postUrl($postId);
    }

    /** @deprecated Use notificationsUrl() */
    public static function notificationsPath(): string
    {
        return self::notificationsUrl();
    }

    public static function clubOrigin(): string
    {
        $configured = rtrim((string) config('family.entry.base_url', ''), '/');
        if ($configured !== '' && self::isUsableOrigin($configured)) {
            return self::normalizeClubOrigin($configured);
        }

        return 'https://rostami.club';
    }

    /**
     * Normalize legacy `/family…` paths and relative club paths to absolute club URLs.
     */
    public static function absolute(string $pathOrUrl): string
    {
        $trimmed = trim($pathOrUrl);
        if ($trimmed === '') {
            return self::homeUrl();
        }

        if (preg_match('#^https?://#i', $trimmed)) {
            return self::normalizeAbsoluteClubUrl($trimmed);
        }

        $path = '/'.ltrim($trimmed, '/');

        if ($path === '/family' || $path === '/family/') {
            return self::homeUrl();
        }

        if (str_starts_with($path, '/family?')) {
            return self::clubOrigin().'/?'.substr($path, strlen('/family?'));
        }

        if ($path === '/family/notifications') {
            return self::notificationsUrl();
        }

        if (str_starts_with($path, '/family/')) {
            return self::clubOrigin().substr($path, strlen('/family'));
        }

        return self::clubOrigin().$path;
    }

    private static function normalizeAbsoluteClubUrl(string $url): string
    {
        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if (in_array($host, ['localhost', '127.0.0.1', '0.0.0.0'], true)) {
            $path = (string) parse_url($url, PHP_URL_PATH);
            $query = parse_url($url, PHP_URL_QUERY);
            $suffix = $path.($query ? '?'.$query : '');

            return self::absolute($suffix);
        }

        if (in_array($host, ['rostami.app', 'www.rostami.app'], true)) {
            $path = (string) parse_url($url, PHP_URL_PATH);
            $query = parse_url($url, PHP_URL_QUERY);
            $suffix = $path.($query ? '?'.$query : '');

            return self::absolute($suffix);
        }

        return $url;
    }

    private static function normalizeClubOrigin(string $base): string
    {
        $host = strtolower((string) parse_url($base, PHP_URL_HOST));
        if (in_array($host, ['rostami.app', 'www.rostami.app'], true)) {
            return 'https://rostami.club';
        }

        return $base;
    }

    private static function isUsableOrigin(string $url): bool
    {
        if (! preg_match('#^https?://#i', $url)) {
            return false;
        }

        $host = strtolower((string) parse_url($url, PHP_URL_HOST));
        if ($host === '') {
            return false;
        }

        if (in_array($host, ['localhost', '127.0.0.1', '0.0.0.0'], true)) {
            return false;
        }

        return str_ends_with($host, '.lvh.me')
            || $host === 'lvh.me'
            || ! in_array($host, ['localhost', '127.0.0.1'], true);
    }
}
