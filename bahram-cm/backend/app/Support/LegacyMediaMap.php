<?php

namespace App\Support;

use App\Models\Media;
use Illuminate\Support\Facades\Cache;

/** Maps legacy `/media/...` paths to portable `/storage/media/...` references. */
final class LegacyMediaMap
{
    private const CACHE_KEY = 'media.legacy_path_map';

    /** @return array<string, string> legacy_path => /storage/... */
    public static function all(): array
    {
        return Cache::remember(self::CACHE_KEY, 86_400, function () {
            $map = [];
            Media::query()
                ->whereNotNull('legacy_path')
                ->where('is_private', false)
                ->select(['legacy_path', 'path'])
                ->each(function (Media $media) use (&$map) {
                    $ref = MediaUrl::fromDiskPath($media->path);
                    if ($ref) {
                        $map[$media->legacy_path] = $ref;
                    }
                });

            return $map;
        });
    }

    public static function resolveStorageReference(string $legacyPath): ?string
    {
        if (! str_starts_with($legacyPath, '/media/') && ! str_starts_with($legacyPath, '/images/')) {
            return null;
        }

        return self::all()[$legacyPath] ?? null;
    }

    public static function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
