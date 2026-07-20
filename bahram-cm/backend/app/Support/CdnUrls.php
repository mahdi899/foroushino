<?php

namespace App\Support;

/** Build absolute URLs for CDN edge purge (Arvan / Cloudflare) and warm-cache requests. */
final class CdnUrls
{
    public static function siteOrigin(): string
    {
        return rtrim((string) config('bahram.frontend_url', 'http://localhost:3000'), '/');
    }

    public static function mediaOrigin(): string
    {
        $media = trim((string) config('bahram.media_url', ''));

        return $media !== '' ? rtrim($media, '/') : self::siteOrigin();
    }

    public static function sitePath(string $path): string
    {
        return self::siteOrigin().'/'.ltrim($path, '/');
    }

    public static function mediaPath(string $path): string
    {
        $normalized = '/'.ltrim($path, '/');

        return self::mediaOrigin().$normalized;
    }

    /**
     * @param  list<string>  $paths  Site paths e.g. /insights/foo
     * @return list<string>
     */
    public static function purgeUrlsForPaths(array $paths): array
    {
        $urls = [];
        $site = self::siteOrigin();
        $media = self::mediaOrigin();

        foreach ($paths as $path) {
            if (! is_string($path) || $path === '') {
                continue;
            }
            $normalized = '/'.ltrim($path, '/');
            $urls[] = $site.$normalized;

            if ($media !== $site) {
                if (str_starts_with($normalized, '/storage/media/')) {
                    $urls[] = $media.MediaUrl::cdnPathFromStorageRef($normalized);
                } elseif (str_starts_with($normalized, '/media/') || str_starts_with($normalized, '/cdn/')) {
                    $urls[] = $media.$normalized;
                }
            }
        }

        return array_values(array_unique($urls));
    }

    /** @return list<string> */
    public static function mediaPurgePrefixes(): array
    {
        $origin = self::mediaOrigin();

        return array_values(array_unique([
            $origin.'/cdn/media/',
            $origin.'/media/',
        ]));
    }
}
