<?php

namespace App\Services;

use App\Models\Media;
use App\Support\MediaUrl;
use Illuminate\Support\Facades\Cache;

class MediaAltResolver
{
    private const CACHE_TTL = 3600;

    public function resolve(?string $url, ?string $fallback = null): string
    {
        $ref = MediaUrl::reference($url);
        if ($ref === null || trim($ref) === '') {
            return $this->finalAlt(null, $fallback, $url);
        }

        $alt = $this->lookup($ref);
        if ($alt !== null && $alt !== '') {
            return $alt;
        }

        return $this->finalAlt(null, $fallback, $ref);
    }

    public function lookup(string $reference): ?string
    {
        $ref = MediaUrl::reference($reference);
        if ($ref === null || trim($ref) === '') {
            return null;
        }

        return Cache::remember($this->cacheKey($ref), self::CACHE_TTL, function () use ($ref) {
            $diskPath = ltrim(str_replace('/storage/', '', $ref), '/');
            $basename = basename($diskPath);

            $media = Media::query()
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

            $alt = $media?->alt_fa;

            return is_string($alt) && trim($alt) !== '' ? trim($alt) : null;
        });
    }

    public function forget(string $reference): void
    {
        $ref = MediaUrl::reference($reference);
        if ($ref !== null) {
            Cache::forget($this->cacheKey($ref));
        }
    }

    /**
     * Preload alt text for many media refs in one query (avoids N+1 on article lists).
     *
     * @param  list<string|null>  $references
     */
    public function warmReferences(array $references): void
    {
        $pending = [];

        foreach ($references as $reference) {
            $ref = MediaUrl::reference($reference);
            if ($ref === null || trim($ref) === '') {
                continue;
            }
            if (Cache::has($this->cacheKey($ref))) {
                continue;
            }
            $diskPath = ltrim(str_replace('/storage/', '', $ref), '/');
            $pending[$ref] = [
                'disk_path' => $diskPath,
                'basename' => basename($diskPath),
            ];
        }

        if ($pending === []) {
            return;
        }

        $diskPaths = array_values(array_unique(array_column($pending, 'disk_path')));
        $refs = array_keys($pending);

        $rows = Media::query()
            ->where('is_private', false)
            ->where(function ($q) use ($refs, $diskPaths) {
                $q->whereIn('url', $refs)
                    ->orWhereIn('path', $diskPaths);
                foreach ($refs as $ref) {
                    $basename = basename(ltrim(str_replace('/storage/', '', $ref), '/'));
                    $q->orWhere('legacy_path', $ref)
                        ->orWhere('legacy_path', '/images/'.$basename)
                        ->orWhere('legacy_path', '/media/'.$basename);
                }
            })
            ->orderByDesc('id')
            ->get();

        foreach ($pending as $ref => $meta) {
            $media = $rows->first(function (Media $row) use ($ref, $meta) {
                return $row->url === $ref
                    || $row->path === $meta['disk_path']
                    || $row->legacy_path === $ref
                    || $row->legacy_path === '/images/'.$meta['basename']
                    || $row->legacy_path === '/media/'.$meta['basename'];
            });

            $alt = is_string($media?->alt_fa) && trim($media->alt_fa) !== '' ? trim($media->alt_fa) : null;
            Cache::put($this->cacheKey($ref), $alt, self::CACHE_TTL);
        }
    }

    private function cacheKey(string $ref): string
    {
        return 'media_alt:'.md5($ref);
    }

    private function finalAlt(?string $alt, ?string $fallback, ?string $source): string
    {
        if (is_string($alt) && trim($alt) !== '') {
            return trim($alt);
        }

        if (is_string($fallback) && trim($fallback) !== '') {
            return trim($fallback);
        }

        if (is_string($source) && trim($source) !== '') {
            $filename = pathinfo(parse_url($source, PHP_URL_PATH) ?? $source, PATHINFO_FILENAME);
            $readable = trim(str_replace(['-', '_'], ' ', $filename));
            if ($readable !== '') {
                return mb_substr($readable, 0, 255);
            }
        }

        return 'تصویر';
    }
}
