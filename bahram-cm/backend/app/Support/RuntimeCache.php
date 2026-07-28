<?php

namespace App\Support;

use App\Services\CacheService;
use Closure;
use Illuminate\Support\Facades\Cache;

/** Laravel object cache that respects admin panel object_cache + per-content TTL. */
class RuntimeCache
{
    /** @var array<string, mixed>|null */
    private static ?array $settingsMemo = null;

    /** @var array<string, string> */
    private const CONTENT_TTL_KEYS = [
        'articles' => 'ttl_articles',
        'cases' => 'ttl_cases',
        'testimonials' => 'ttl_cases',
        'faqs' => 'ttl_settings',
        'services' => 'ttl_services',
        'settings' => 'ttl_settings',
        'home' => 'ttl_home',
    ];

    /**
     * @param  null|'articles'|'cases'|'testimonials'|'faqs'|'services'|'settings'|'home'  $contentGroup
     */
    public static function remember(string $key, int $defaultTtl, Closure $callback, ?string $contentGroup = null): mixed
    {
        $settings = self::settings();
        if (! ($settings['object_cache'] ?? true)) {
            return $callback();
        }

        $ttl = self::resolveTtl($settings, $defaultTtl, $contentGroup);

        return Cache::remember($key, $ttl, $callback);
    }

    public static function forget(string $key): void
    {
        Cache::forget($key);
    }

    /** Drop per-request settings memo (call after cache settings update). */
    public static function flushSettingsMemo(): void
    {
        self::$settingsMemo = null;
    }

    /** @return array<string, mixed> */
    private static function settings(): array
    {
        return self::$settingsMemo ??= app(CacheService::class)->getSettings();
    }

    /** @param  array<string, mixed>  $settings */
    private static function resolveTtl(array $settings, int $defaultTtl, ?string $contentGroup): int
    {
        if ($contentGroup !== null) {
            $settingKey = self::CONTENT_TTL_KEYS[$contentGroup] ?? null;
            if ($settingKey !== null) {
                return max(30, (int) ($settings[$settingKey] ?? $defaultTtl));
            }
        }

        return max(30, (int) ($settings['api_cache_ttl'] ?? $defaultTtl));
    }
}
