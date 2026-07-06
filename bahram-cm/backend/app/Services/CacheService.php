<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * LiteSpeed-style cache orchestration: ISR purge (Next.js), Laravel object cache,
 * optional Cloudflare CDN purge, settings, and purge audit log.
 */
class CacheService
{
    public const GROUP = 'cache';

    /** Max purge audit entries kept in settings (older rows are dropped). */
    public const PURGE_LOG_LIMIT = 10;

    /** All ISR tags used by the Next.js frontend. */
    public const ISR_TAGS = [
        'articles',
        'cases',
        'doctors',
        'services',
        'settings',
        'pricing',
        'seo',
        'redirects',
        'faqs',
        'testimonials',
        'chatbot',
    ];

    public const DEFAULT_SETTINGS = [
        'performance_preset' => 'balanced',
        'page_cache' => true,
        'object_cache' => true,
        'browser_cache' => true,
        'browser_cache_ttl' => 3600,
        'cdn_html_cache' => false,
        'cloudflare_auto_purge' => false,
        'lazy_load_images' => true,
        'lazy_load_chatbot' => true,
        'defer_analytics' => true,
        'defer_below_fold' => true,
        'prefetch_links' => false,
        'auto_purge_on_save' => true,
        'warm_cache_after_purge' => false,
        'gzip_enabled' => true,
        'api_cache_ttl' => 300,
        'ttl_articles' => 300,
        'ttl_cases' => 600,
        'ttl_doctors' => 3600,
        'ttl_services' => 3600,
        'ttl_settings' => 3600,
        'ttl_pricing' => 600,
        'ttl_home' => 600,
        'developer_mode' => false,
    ];

    /** Settings applied when developer mode is enabled. */
    public const DEVELOPER_MODE_SETTINGS = [
        'developer_mode' => true,
        'performance_preset' => 'fresh',
        'page_cache' => false,
        'object_cache' => false,
        'browser_cache' => false,
        'browser_cache_ttl' => 60,
        'cdn_html_cache' => false,
        'lazy_load_images' => false,
        'lazy_load_chatbot' => false,
        'defer_analytics' => false,
        'defer_below_fold' => false,
        'prefetch_links' => true,
        'warm_cache_after_purge' => false,
        'auto_purge_on_save' => false,
        'api_cache_ttl' => 60,
        'ttl_articles' => 60,
        'ttl_cases' => 60,
        'ttl_doctors' => 60,
        'ttl_services' => 60,
        'ttl_settings' => 60,
        'ttl_pricing' => 60,
        'ttl_home' => 60,
    ];

    public function __construct(
        private readonly SettingService $settings,
        private readonly RevalidationService $revalidation,
        private readonly CacheIntegrationService $integrations,
    ) {}

    public function getSettings(): array
    {
        $stored = $this->settings->group(self::GROUP);
        $merged = array_merge(self::DEFAULT_SETTINGS, $stored);
        unset($merged['dev_mode_snapshot']);
        $merged['developer_mode'] = filter_var($merged['developer_mode'] ?? false, FILTER_VALIDATE_BOOL);
        $merged['purge_log'] = $this->purgeLogEntries($stored['purge_log'] ?? null, true);

        return $merged;
    }

    public function updateSettings(array $input): array
    {
        $allowed = array_keys(self::DEFAULT_SETTINGS);
        $pairs = [];
        foreach ($allowed as $key) {
            if (array_key_exists($key, $input)) {
                $pairs[$key] = is_bool($input[$key]) ? ($input[$key] ? '1' : '0') : (string) $input[$key];
            }
        }

        if ($pairs !== []) {
            $existing = $this->settings->group(self::GROUP);
            $log = $existing['purge_log'] ?? '[]';
            $this->settings->updateGroup(self::GROUP, array_merge($pairs, ['purge_log' => $log]));
        }

        Cache::forget('cache.public.config');

        return $this->getSettings();
    }

    /** Public-safe config for Next.js middleware (no secrets). */
    public function publicConfig(): array
    {
        return Cache::remember('cache.public.config', 60, function () {
            $s = $this->getSettings();

            if ($s['developer_mode'] ?? false) {
                return [
                    'developer_mode' => true,
                    'page_cache' => false,
                    'browser_cache' => false,
                    'browser_cache_ttl' => 60,
                    'lazy_load_images' => false,
                    'lazy_load_chatbot' => false,
                    'defer_analytics' => false,
                    'defer_below_fold' => false,
                    'prefetch_links' => true,
                    'ttls' => [
                        'articles' => 60,
                        'cases' => 60,
                        'doctors' => 60,
                        'services' => 60,
                        'settings' => 60,
                        'pricing' => 60,
                        'home' => 60,
                    ],
                ];
            }

            return [
                'developer_mode' => false,
                'page_cache' => (bool) ($s['page_cache'] ?? true),
                'browser_cache' => (bool) ($s['browser_cache'] ?? true),
                'browser_cache_ttl' => (int) ($s['browser_cache_ttl'] ?? 3600),
                'lazy_load_images' => (bool) ($s['lazy_load_images'] ?? true),
                'lazy_load_chatbot' => (bool) ($s['lazy_load_chatbot'] ?? true),
                'defer_analytics' => (bool) ($s['defer_analytics'] ?? true),
                'defer_below_fold' => (bool) ($s['defer_below_fold'] ?? true),
                'prefetch_links' => (bool) ($s['prefetch_links'] ?? false),
                'ttls' => [
                    'articles' => (int) ($s['ttl_articles'] ?? 300),
                    'cases' => (int) ($s['ttl_cases'] ?? 600),
                    'doctors' => (int) ($s['ttl_doctors'] ?? 3600),
                    'services' => (int) ($s['ttl_services'] ?? 3600),
                    'settings' => (int) ($s['ttl_settings'] ?? 3600),
                    'pricing' => (int) ($s['ttl_pricing'] ?? 600),
                    'home' => (int) ($s['ttl_home'] ?? 600),
                ],
            ];
        });
    }

    public function status(): array
    {
        $driver = config('cache.default');
        $settings = $this->getSettings();

        return [
            'laravel_cache_driver' => $driver,
            'next_webhook_configured' => $this->integrations->webhookConfigured(),
            'cloudflare_configured' => $this->integrations->cloudflareConfigured(),
            'developer_mode' => (bool) ($settings['developer_mode'] ?? false),
            'cloudflare_dev_mode' => $this->fetchCloudflareDevelopmentMode(),
            'modules' => [
                'page_cache' => (bool) ($settings['page_cache'] ?? true),
                'object_cache' => (bool) ($settings['object_cache'] ?? true),
                'browser_cache' => (bool) ($settings['browser_cache'] ?? true),
                'cdn_html_cache' => (bool) ($settings['cdn_html_cache'] ?? false),
                'cloudflare_auto_purge' => (bool) ($settings['cloudflare_auto_purge'] ?? false),
            ],
            'isr_tags' => self::ISR_TAGS,
            'isr_ttls' => [
                'articles' => (int) ($settings['ttl_articles'] ?? 300),
                'cases' => (int) ($settings['ttl_cases'] ?? 600),
                'pricing' => (int) ($settings['ttl_pricing'] ?? 600),
                'settings' => (int) ($settings['ttl_settings'] ?? 3600),
                'services' => (int) ($settings['ttl_services'] ?? 3600),
                'doctors' => (int) ($settings['ttl_doctors'] ?? 3600),
                'home' => (int) ($settings['ttl_home'] ?? 600),
                'seo' => (int) ($settings['ttl_settings'] ?? 3600),
            ],
            'purge_log' => $settings['purge_log'] ?? [],
        ];
    }

    /**
     * @param  array{tags?: string[], paths?: string[], warm?: bool}  $options
     * @return array<string, mixed>
     */
    public function purge(string $scope, array $options = [], ?string $actor = null): array
    {
        $result = [
            'scope' => $scope,
            'isr' => ['tags' => [], 'paths' => []],
            'laravel' => false,
            'cloudflare' => false,
            'warmed' => [],
        ];

        $settings = $this->getSettings();

        switch ($scope) {
            case 'all':
                $result['isr']['tags'] = self::ISR_TAGS;
                $result['isr']['paths'] = ['/', '/blog', '/cases', '/pricing', '/sitemap.xml', '/robots.txt'];
                if ($settings['object_cache'] ?? true) {
                    Cache::flush();
                    $result['laravel'] = true;
                }
                if ($settings['cloudflare_auto_purge'] ?? false) {
                    $result['cloudflare'] = $this->purgeCloudflare();
                }
                break;

            case 'isr':
                $tags = $options['tags'] ?? self::ISR_TAGS;
                $paths = $options['paths'] ?? [];
                $result['isr']['tags'] = $tags;
                $result['isr']['paths'] = $paths;
                break;

            case 'laravel':
                Cache::flush();
                $result['laravel'] = true;
                break;

            case 'cloudflare':
                $result['cloudflare'] = $this->purgeCloudflare();
                break;

            default:
                if (str_starts_with($scope, 'tag:')) {
                    $tag = substr($scope, 4);
                    $result['isr']['tags'] = [$tag];
                } elseif (str_starts_with($scope, 'path:')) {
                    $path = substr($scope, 5);
                    $result['isr']['paths'] = [$path];
                }
                break;
        }

        if ($result['isr']['tags'] !== [] || $result['isr']['paths'] !== []) {
            $this->revalidation->trigger($result['isr']['tags'], $result['isr']['paths']);
        }

        $warm = $options['warm'] ?? ($settings['warm_cache_after_purge'] ?? false);
        if ($warm && ($result['isr']['paths'] !== [] || $scope === 'all')) {
            $urls = $this->warmUrls($result['isr']['paths'] ?: ['/', '/blog', '/cases', '/pricing']);
            $result['warmed'] = $urls;
        }

        $this->appendPurgeLog($scope, $result, $actor);

        return $result;
    }

    /**
     * Enable/disable developer mode: disable all optimizations, toggle Cloudflare dev mode, purge caches.
     *
     * @return array<string, mixed>
     */
    public function setDeveloperMode(bool $enable, ?string $actor = null): array
    {
        $stored = $this->settings->group(self::GROUP);
        $wasEnabled = filter_var($stored['developer_mode'] ?? false, FILTER_VALIDATE_BOOL);

        if ($enable) {
            if (! $wasEnabled) {
                $snapshot = $this->getSettings();
                unset($snapshot['purge_log'], $snapshot['developer_mode']);
                $this->settings->updateGroup(self::GROUP, [
                    'dev_mode_snapshot' => json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                ]);
            }

            $pairs = [];
            foreach (self::DEVELOPER_MODE_SETTINGS as $key => $value) {
                $pairs[$key] = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
            }
            $log = $stored['purge_log'] ?? '[]';
            $snapshot = $stored['dev_mode_snapshot'] ?? ($this->settings->group(self::GROUP)['dev_mode_snapshot'] ?? null);
            $extra = ['purge_log' => $log];
            if ($snapshot) {
                $extra['dev_mode_snapshot'] = $snapshot;
            }
            $this->settings->updateGroup(self::GROUP, array_merge($pairs, $extra));

            Cache::flush();
            Cache::forget('cache.public.config');

            $cloudflare = $this->setCloudflareDevelopmentMode(true);
            $purge = $this->purge('all', ['warm' => false], $actor);

            return [
                'developer_mode' => true,
                'cloudflare_dev_mode' => $cloudflare,
                'purge' => $purge,
                'settings' => $this->getSettings(),
            ];
        }

        $restored = $this->restoreDeveloperSnapshot();
        if ($restored === []) {
            foreach (self::DEFAULT_SETTINGS as $key => $value) {
                if ($key === 'developer_mode') {
                    continue;
                }
                $restored[$key] = is_bool($value) ? ($value ? '1' : '0') : (string) $value;
            }
        }
        $pairs = ['developer_mode' => '0'];
        $log = $stored['purge_log'] ?? '[]';
        $this->settings->updateGroup(self::GROUP, array_merge($pairs, $restored, ['purge_log' => $log]));

        Cache::flush();
        Cache::forget('cache.public.config');

        $cloudflare = $this->setCloudflareDevelopmentMode(false);
        $purge = $this->purge('isr', [], $actor);

        return [
            'developer_mode' => false,
            'cloudflare_dev_mode' => $cloudflare,
            'restored' => $restored !== [],
            'purge' => $purge,
            'settings' => $this->getSettings(),
        ];
    }

    /** @return array<string, string> */
    private function restoreDeveloperSnapshot(): array
    {
        $stored = $this->settings->group(self::GROUP);
        $raw = $stored['dev_mode_snapshot'] ?? null;
        if (! $raw) {
            return [];
        }

        $decoded = json_decode($raw, true);
        if (! is_array($decoded)) {
            return [];
        }

        $pairs = [];
        foreach (array_keys(self::DEFAULT_SETTINGS) as $key) {
            if ($key === 'developer_mode' || ! array_key_exists($key, $decoded)) {
                continue;
            }
            $val = $decoded[$key];
            $pairs[$key] = is_bool($val) ? ($val ? '1' : '0') : (string) $val;
        }

        $this->settings->updateGroup(self::GROUP, ['dev_mode_snapshot' => '']);

        return $pairs;
    }

    private function setCloudflareDevelopmentMode(bool $on): bool
    {
        $zoneId = $this->integrations->cloudflareZoneId();
        $token = $this->integrations->cloudflareApiToken();
        if (! $zoneId || ! $token) {
            return false;
        }

        try {
            $res = Http::withToken($token)
                ->timeout(10)
                ->patch("https://api.cloudflare.com/client/v4/zones/{$zoneId}/settings/development_mode", [
                    'value' => $on ? 'on' : 'off',
                ]);

            if (! $res->successful()) {
                Log::info('[cloudflare-dev-mode] failed: '.$res->body());

                return false;
            }

            $json = $res->json();
            $value = $json['result']['value'] ?? null;

            return $value === 'on';
        } catch (\Throwable $e) {
            Log::info('[cloudflare-dev-mode] failed: '.$e->getMessage());

            return false;
        }
    }

  private function fetchCloudflareDevelopmentMode(): ?bool
    {
        if (! $this->integrations->cloudflareConfigured()) {
            return null;
        }

        $zoneId = $this->integrations->cloudflareZoneId();
        $token = $this->integrations->cloudflareApiToken();

        try {
            $res = Http::withToken($token)
                ->timeout(8)
                ->get("https://api.cloudflare.com/client/v4/zones/{$zoneId}/settings/development_mode");

            if (! $res->successful()) {
                return null;
            }

            $value = $res->json('result.value');

            return $value === 'on' ? true : ($value === 'off' ? false : null);
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** @return list<string> */
    private function warmUrls(array $paths): array
    {
        $base = rtrim(config('bahram.frontend_url', 'http://localhost:3000'), '/');
        $warmed = [];
        foreach ($paths as $path) {
            $url = $base.'/'.ltrim($path, '/');
            try {
                Http::timeout(8)->get($url);
                $warmed[] = $path;
            } catch (\Throwable $e) {
                Log::info('[cache-warm] failed '.$url.': '.$e->getMessage());
            }
        }

        return $warmed;
    }

    private function cloudflareConfigured(): bool
    {
        return $this->integrations->cloudflareConfigured();
    }

    public function integrationsAdminView(): array
    {
        return $this->integrations->adminView();
    }

    /** @param  array<string, mixed>  $input */
    public function updateIntegrations(array $input): array
    {
        return $this->integrations->update($input);
    }

    /** @return array{ok: bool, message: string} */
    public function testWebhookIntegration(): array
    {
        return $this->integrations->testWebhook();
    }

    /** @return array{ok: bool, message: string, zone_name?: string} */
    public function testCloudflareIntegration(): array
    {
        return $this->integrations->testCloudflare();
    }

    public function verifyRevalidateSecret(string $secret): bool
    {
        return $this->integrations->verifyRevalidateSecret($secret);
    }

    private function purgeCloudflare(): bool
    {
        $zoneId = $this->integrations->cloudflareZoneId();
        $token = $this->integrations->cloudflareApiToken();
        if (! $zoneId || ! $token) {
            return false;
        }

        try {
            $res = Http::withToken($token)
                ->timeout(10)
                ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/purge_cache", [
                    'purge_everything' => true,
                ]);

            return $res->successful();
        } catch (\Throwable $e) {
            Log::info('[cloudflare-purge] failed: '.$e->getMessage());

            return false;
        }
    }

  /**
     * @return list<array<string, mixed>>
     */
    private function decodePurgeLog(mixed $raw): array
    {
        if (! $raw) {
            return [];
        }
        if (is_array($raw)) {
            return $raw;
        }
        if (! is_string($raw)) {
            return [];
        }
        $decoded = json_decode($raw, true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function purgeLogEntries(mixed $raw, bool $persistTrim = false): array
    {
        $log = $this->decodePurgeLog($raw);
        if (count($log) <= self::PURGE_LOG_LIMIT) {
            return $log;
        }

        $log = array_slice($log, 0, self::PURGE_LOG_LIMIT);

        if ($persistTrim) {
            \App\Models\Setting::updateOrCreate(
                ['group' => self::GROUP, 'key' => 'purge_log'],
                ['value' => $log]
            );
            Cache::forget('cache.public.config');
        }

        return $log;
    }

    /** @param  array<string, mixed>  $result */
    private function appendPurgeLog(string $scope, array $result, ?string $actor): void
    {
        $existing = $this->settings->group(self::GROUP);
        $log = $this->decodePurgeLog($existing['purge_log'] ?? null);
        array_unshift($log, [
            'at' => now()->toIso8601String(),
            'scope' => $scope,
            'actor' => $actor,
            'tags' => $result['isr']['tags'] ?? [],
            'paths' => $result['isr']['paths'] ?? [],
            'laravel' => $result['laravel'] ?? false,
            'cloudflare' => $result['cloudflare'] ?? false,
        ]);
        $log = array_slice($log, 0, self::PURGE_LOG_LIMIT);

        \App\Models\Setting::updateOrCreate(
            ['group' => self::GROUP, 'key' => 'purge_log'],
            ['value' => $log]
        );
        Cache::forget('cache.public.config');
    }
}
