<?php

namespace App\Services;

use App\Services\CacheIntegrationService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Applies Cloudflare edge Cache Rules + recommended speed/security zone settings
 * using panel-stored Zone ID + API Token.
 */
class CloudflareEdgeHardeningService
{
    private const PHASE = 'http_request_cache_settings';

    public function __construct(
        private readonly CacheIntegrationService $integrations,
        private readonly CacheService $cache,
    ) {}

    /**
     * @return array{
     *     ok: bool,
     *     message: string,
     *     zone_name?: string,
     *     steps: list<array{id: string, ok: bool, detail: string}>
     * }
     */
    public function applySpeedAndSecurity(): array
    {
        $zoneId = $this->integrations->cloudflareZoneId();
        $token = $this->integrations->cloudflareApiToken();

        if (! $zoneId || ! $token) {
            return [
                'ok' => false,
                'message' => 'ابتدا CLOUDFLARE_ZONE_ID و CLOUDFLARE_API_TOKEN را در تنظیمات ذخیره کنید.',
                'steps' => [],
            ];
        }

        $steps = [];

        try {
            $zone = $this->cfGet($token, "zones/{$zoneId}");
            $zoneName = (string) ($zone['result']['name'] ?? $zoneId);
            $steps[] = ['id' => 'zone', 'ok' => true, 'detail' => 'Zone: '.$zoneName];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'اتصال به Zone ناموفق: '.$e->getMessage(),
                'steps' => [['id' => 'zone', 'ok' => false, 'detail' => $e->getMessage()]],
            ];
        }

        $steps[] = $this->stepEnableSiteCacheFlags();
        $steps[] = $this->stepApplyCacheRules($token, $zoneId);
        foreach ($this->recommendedZoneSettings() as $setting => $value) {
            $steps[] = $this->stepPatchZoneSetting($token, $zoneId, $setting, $value);
        }

        $failed = array_values(array_filter($steps, static fn (array $s): bool => ! $s['ok']));
        $ok = $failed === [];

        return [
            'ok' => $ok,
            'message' => $ok
                ? 'تنظیمات سرعت و امنیت Cloudflare اعمال شد.'
                : 'برخی مراحل ناموفق بود — جزئیات را ببینید (دسترسی Token را کامل‌تر کنید).',
            'zone_name' => $zoneName ?? null,
            'steps' => $steps,
        ];
    }

    /** @return list<array{id: string, value: mixed, label: string}> */
    private function recommendedZoneSettings(): array
    {
        return [
            ['id' => 'ssl', 'value' => 'strict', 'label' => 'SSL/TLS Full (strict)'],
            ['id' => 'always_use_https', 'value' => 'on', 'label' => 'Always Use HTTPS'],
            ['id' => 'min_tls_version', 'value' => '1.2', 'label' => 'Min TLS 1.2'],
            ['id' => 'tls_1_3', 'value' => 'on', 'label' => 'TLS 1.3'],
            ['id' => 'automatic_https_rewrites', 'value' => 'on', 'label' => 'Automatic HTTPS Rewrites'],
            ['id' => 'brotli', 'value' => 'on', 'label' => 'Brotli'],
            ['id' => 'early_hints', 'value' => 'on', 'label' => 'Early Hints'],
            ['id' => 'http3', 'value' => 'on', 'label' => 'HTTP/3'],
            ['id' => '0rtt', 'value' => 'on', 'label' => '0-RTT'],
            ['id' => 'browser_check', 'value' => 'on', 'label' => 'Browser Integrity Check'],
            ['id' => 'email_obfuscation', 'value' => 'on', 'label' => 'Email Obfuscation'],
            ['id' => 'server_side_exclude', 'value' => 'on', 'label' => 'Server-side Excludes'],
            ['id' => 'rocket_loader', 'value' => 'off', 'label' => 'Rocket Loader OFF (Next.js)'],
            ['id' => 'development_mode', 'value' => 'off', 'label' => 'Development Mode OFF'],
            [
                'id' => 'minify',
                'value' => ['css' => 'on', 'html' => 'off', 'js' => 'off'],
                'label' => 'Minify CSS only (HTML/JS off)',
            ],
            [
                'id' => 'security_header',
                'value' => [
                    'strict_transport_security' => [
                        'enabled' => true,
                        'max_age' => 31536000,
                        'include_subdomains' => true,
                        'nosniff' => true,
                    ],
                ],
                'label' => 'HSTS (1 year)',
            ],
        ];
    }

    /** @return array{id: string, ok: bool, detail: string} */
    private function stepEnableSiteCacheFlags(): array
    {
        try {
            $this->cache->updateSettings([
                'cdn_html_cache' => true,
                'cdn_auto_purge' => true,
                'page_cache' => true,
                'browser_cache' => true,
                'developer_mode' => false,
                'auto_purge_on_save' => true,
            ]);

            return [
                'id' => 'site_flags',
                'ok' => true,
                'detail' => 'cdn_html_cache + auto_purge روشن شد',
            ];
        } catch (\Throwable $e) {
            return ['id' => 'site_flags', 'ok' => false, 'detail' => $e->getMessage()];
        }
    }

    /** @return array{id: string, ok: bool, detail: string} */
    private function stepApplyCacheRules(string $token, string $zoneId): array
    {
        try {
            $path = base_path('../docs/cloudflare-cache-rules.example.json');
            if (! is_file($path)) {
                $path = base_path('../../docs/cloudflare-cache-rules.example.json');
            }
            // Production layout: /var/www/bahram-cm/docs/...
            if (! is_file($path)) {
                $path = dirname(base_path()).'/docs/cloudflare-cache-rules.example.json';
            }
            if (! is_file($path)) {
                throw new RuntimeException('فایل cloudflare-cache-rules.example.json یافت نشد.');
            }

            $examples = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
            if (! is_array($examples)) {
                throw new RuntimeException('JSON قوانین کش نامعتبر است.');
            }

            $rules = $this->examplesToRulesetRules($examples);
            $entryUrl = "zones/{$zoneId}/rulesets/phases/".self::PHASE.'/entrypoint';

            try {
                $this->cfPut($token, $entryUrl, ['rules' => $rules]);
            } catch (RuntimeException $e) {
                if (! str_contains($e->getMessage(), '404')) {
                    throw $e;
                }
                $this->cfPost($token, "zones/{$zoneId}/rulesets", [
                    'name' => 'Bahram cache rules',
                    'kind' => 'zone',
                    'phase' => self::PHASE,
                    'rules' => $rules,
                ]);
            }

            return [
                'id' => 'cache_rules',
                'ok' => true,
                'detail' => count($rules).' قانون Cache Rules اعمال شد',
            ];
        } catch (\Throwable $e) {
            Log::warning('Cloudflare cache rules apply failed', ['error' => $e->getMessage()]);

            return [
                'id' => 'cache_rules',
                'ok' => false,
                'detail' => $e->getMessage().' — Token باید Cache Rules Edit داشته باشد',
            ];
        }
    }

    /**
     * @param  array{id: string, value: mixed, label: string}  $setting
     * @return array{id: string, ok: bool, detail: string}
     */
    private function stepPatchZoneSetting(string $token, string $zoneId, array $setting): array
    {
        $id = $setting['id'];
        try {
            $this->cfPatch($token, "zones/{$zoneId}/settings/{$id}", [
                'value' => $setting['value'],
            ]);

            return [
                'id' => 'setting:'.$id,
                'ok' => true,
                'detail' => $setting['label'],
            ];
        } catch (\Throwable $e) {
            // Plan/permission may block some settings — report but continue.
            return [
                'id' => 'setting:'.$id,
                'ok' => false,
                'detail' => $setting['label'].' — '.$e->getMessage(),
            ];
        }
    }

    /**
     * @param  list<array<string, mixed>>  $examples
     * @return list<array<string, mixed>>
     */
    private function examplesToRulesetRules(array $examples): array
    {
        $rules = [];
        foreach ($examples as $item) {
            $action = (string) ($item['action'] ?? '');
            $expression = (string) ($item['expression'] ?? '');
            $description = (string) ($item['description'] ?? 'cache rule');

            if ($action === 'bypass_cache') {
                $rules[] = [
                    'action' => 'set_cache_settings',
                    'description' => $description,
                    'enabled' => true,
                    'expression' => $expression,
                    'action_parameters' => ['cache' => false],
                ];

                continue;
            }

            $params = is_array($item['action_parameters'] ?? null) ? $item['action_parameters'] : [];
            $edge = is_array($params['edge_ttl'] ?? null) ? $params['edge_ttl'] : ['mode' => 'respect_origin'];
            $browser = is_array($params['browser_ttl'] ?? null) ? $params['browser_ttl'] : ['mode' => 'respect_origin'];

            $edgeTtl = (($edge['mode'] ?? '') === 'override_origin')
                ? ['mode' => 'override_origin', 'default' => (int) ($edge['default'] ?? 31536000)]
                : ['mode' => 'respect_origin'];

            $browserTtl = (($browser['mode'] ?? '') === 'override_origin')
                ? ['mode' => 'override_origin', 'default' => (int) ($browser['default'] ?? 3600)]
                : ['mode' => 'respect_origin'];

            $rules[] = [
                'action' => 'set_cache_settings',
                'description' => $description,
                'enabled' => true,
                'expression' => $expression,
                'action_parameters' => [
                    'cache' => true,
                    'edge_ttl' => $edgeTtl,
                    'browser_ttl' => $browserTtl,
                ],
            ];
        }

        return $rules;
    }

    /** @return array<string, mixed> */
    private function cfGet(string $token, string $path): array
    {
        return $this->cfRequest('GET', $token, $path);
    }

    /** @param  array<string, mixed>  $body */
    private function cfPut(string $token, string $path, array $body): array
    {
        return $this->cfRequest('PUT', $token, $path, $body);
    }

    /** @param  array<string, mixed>  $body */
    private function cfPost(string $token, string $path, array $body): array
    {
        return $this->cfRequest('POST', $token, $path, $body);
    }

    /** @param  array<string, mixed>  $body */
    private function cfPatch(string $token, string $path, array $body): array
    {
        return $this->cfRequest('PATCH', $token, $path, $body);
    }

    /**
     * @param  array<string, mixed>|null  $body
     * @return array<string, mixed>
     */
    private function cfRequest(string $method, string $token, string $path, ?array $body = null): array
    {
        $url = 'https://api.cloudflare.com/client/v4/'.ltrim($path, '/');
        $pending = Http::withToken($token)
            ->acceptJson()
            ->timeout(45);

        $response = match (strtoupper($method)) {
            'GET' => $pending->get($url),
            'PUT' => $pending->put($url, $body ?? []),
            'POST' => $pending->post($url, $body ?? []),
            'PATCH' => $pending->patch($url, $body ?? []),
            default => throw new RuntimeException('Unsupported CF method'),
        };

        $json = $response->json();
        if (! is_array($json)) {
            throw new RuntimeException('پاسخ نامعتبر Cloudflare HTTP '.$response->status());
        }

        if ($response->status() === 404) {
            throw new RuntimeException('404 '.$path);
        }

        if (! $response->successful() || ! ($json['success'] ?? false)) {
            $err = $json['errors'][0]['message'] ?? ('HTTP '.$response->status());

            throw new RuntimeException($err);
        }

        return $json;
    }
}
