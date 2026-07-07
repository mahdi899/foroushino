<?php

namespace App\Support;

use App\Services\CacheService;
use Closure;
use Illuminate\Support\Facades\Cache;

/** Laravel object cache that respects admin panel object_cache + api_cache_ttl. */
class RuntimeCache
{
    public static function remember(string $key, int $defaultTtl, Closure $callback): mixed
    {
        $settings = app(CacheService::class)->getSettings();
        if (! ($settings['object_cache'] ?? true)) {
            return $callback();
        }

        $ttl = max(30, (int) ($settings['api_cache_ttl'] ?? $defaultTtl));

        return Cache::remember($key, $ttl, $callback);
    }

    public static function forget(string $key): void
    {
        Cache::forget($key);
    }
}
