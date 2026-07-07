<?php

namespace App\Services;

use App\Models\Media;
use App\Support\MediaUrl;
use App\Support\RuntimeCache;
use Illuminate\Support\Facades\Cache;

class MediaMetadataResolver
{
    private const CACHE_TTL = 3600;

    /** @return array{alt: string, width: int|null, height: int|null}|null */
    public function lookup(string $reference): ?array
    {
        $ref = MediaUrl::reference($reference);
        if ($ref === null || trim($ref) === '') {
            return null;
        }

        return Cache::remember($this->cacheKey($ref), self::CACHE_TTL, function () use ($ref) {
            $media = $this->findMedia($ref);
            if ($media === null) {
                return null;
            }

            $alt = is_string($media->alt_fa) && trim($media->alt_fa) !== '' ? trim($media->alt_fa) : null;

            return [
                'alt' => $alt,
                'width' => is_numeric($media->width) ? (int) $media->width : null,
                'height' => is_numeric($media->height) ? (int) $media->height : null,
            ];
        });
    }

    public function forget(string $reference): void
    {
        $ref = MediaUrl::reference($reference);
        if ($ref !== null) {
            Cache::forget($this->cacheKey($ref));
            app(MediaAltResolver::class)->forget($ref);
        }
    }

    private function findMedia(string $ref): ?Media
    {
        $diskPath = ltrim(str_replace('/storage/', '', $ref), '/');
        $basename = basename($diskPath);

        return Media::query()
            ->where('is_private', false)
            ->where(function ($q) use ($ref, $diskPath, $basename) {
                $q->where('url', $ref)
                    ->orWhere('path', $diskPath)
                    ->orWhere('legacy_path', $ref)
                    ->orWhere('legacy_path', '/images/'.$basename)
                    ->orWhere('legacy_path', '/media/'.$basename);
            })
            ->orderByDesc('id')
            ->first();
    }

    private function cacheKey(string $ref): string
    {
        return 'media_meta:'.md5($ref);
    }
}
