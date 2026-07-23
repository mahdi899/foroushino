<?php

namespace App\Services\Cloudflare;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Purge Cloudflare edge cache for sat.center. */
final class CloudflareCacheService
{
    private const PHASE = 'http_request_cache_settings';

    public function __construct(
        private readonly CloudflareIntegrationService $integrations,
    ) {}

    public function purgeEverything(): bool
    {
        return $this->purge(['purge_everything' => true]);
    }

    public function purgeAvatars(): bool
    {
        if (! $this->integrations->configured()) {
            return false;
        }

        $host = rtrim((string) config('app.url'), '/');
        if ($host === '') {
            $host = 'https://sat.center';
        }

        return $this->purge([
            'prefixes' => [
                $host.'/storage/avatars/',
                $host.'/api/',
            ],
        ]);
    }

    public function purgeApiAndHtml(): bool
    {
        if (! $this->integrations->configured()) {
            return false;
        }

        $host = rtrim((string) config('app.url'), '/');
        if ($host === '') {
            $host = 'https://sat.center';
        }

        return $this->purge([
            'prefixes' => [
                $host.'/api/',
                $host.'/version.json',
                $host.'/index.html',
            ],
        ]);
    }

    /**
     * Apply recommended Cache Rules so API/HTML are never edge-cached.
     *
     * @return array{ok: bool, message: string, steps: list<array{id: string, ok: bool, detail: string}>}
     */
    public function applyEdgeCacheRules(): array
    {
        $zoneId = $this->integrations->zoneId();
        $token = $this->integrations->apiToken();

        if (! $zoneId || ! $token) {
            return [
                'ok' => false,
                'message' => 'ابتدا Zone ID و API Token را ذخیره کنید.',
                'steps' => [],
            ];
        }

        $steps = [];
        $zoneName = $zoneId;

        try {
            $zoneRes = Http::withToken($token)->acceptJson()->timeout(30)
                ->get("https://api.cloudflare.com/client/v4/zones/{$zoneId}");
            if ($zoneRes->successful() && ($zoneRes->json('success') ?? false)) {
                $zoneName = (string) ($zoneRes->json('result.name') ?? $zoneId);
                $steps[] = ['id' => 'zone', 'ok' => true, 'detail' => 'Zone: '.$zoneName];
            } else {
                $steps[] = ['id' => 'zone', 'ok' => false, 'detail' => 'Zone lookup failed'];
            }
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'message' => 'اتصال به Zone ناموفق: '.$e->getMessage(),
                'steps' => [['id' => 'zone', 'ok' => false, 'detail' => $e->getMessage()]],
            ];
        }

        $rules = $this->recommendedCacheRules();
        $rulesStep = $this->applyCacheRules($token, $zoneId, $rules);
        $steps[] = $rulesStep;

        $purgeStep = $this->purgeEverything();
        $steps[] = [
            'id' => 'purge',
            'ok' => $purgeStep,
            'detail' => $purgeStep ? 'کش لبه پاک شد' : 'پاک‌سازی کش ناموفق (Token نیاز به Cache Purge دارد)',
        ];

        $failed = array_values(array_filter($steps, static fn (array $s): bool => ! $s['ok']));

        return [
            'ok' => $failed === [],
            'message' => $failed === []
                ? 'قوانین کش Cloudflare اعمال و کش پاک شد.'
                : 'برخی مراحل ناموفق بود — Token باید Zone Settings + Cache Purge + Cache Rules Edit داشته باشد.',
            'steps' => $steps,
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function purge(array $body): bool
    {
        $zoneId = $this->integrations->zoneId();
        $token = $this->integrations->apiToken();
        if (! $zoneId || ! $token) {
            return false;
        }

        try {
            $res = Http::withToken($token)
                ->acceptJson()
                ->timeout(45)
                ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/purge_cache", $body);

            if (! $res->successful() || ! ($res->json('success') ?? false)) {
                Log::info('[cloudflare-purge] failed: '.$res->body());

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::info('[cloudflare-purge] failed: '.$e->getMessage());

            return false;
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function recommendedCacheRules(): array
    {
        return [
            [
                'action' => 'set_cache_settings',
                'description' => 'Saat — bypass API + Sanctum + health',
                'enabled' => true,
                'expression' => '(http.request.uri.path starts_with "/api") or (http.request.uri.path starts_with "/sanctum") or (http.request.uri.path eq "/up")',
                'action_parameters' => ['cache' => false],
            ],
            [
                'action' => 'set_cache_settings',
                'description' => 'Saat — bypass SPA shell + version + avatars',
                'enabled' => true,
                'expression' => '(http.request.uri.path eq "/version.json") or (http.request.uri.path eq "/index.html") or (http.request.uri.path starts_with "/storage/avatars/")',
                'action_parameters' => ['cache' => false],
            ],
            [
                'action' => 'set_cache_settings',
                'description' => 'Saat — bypass SPA routes (no static extension)',
                'enabled' => true,
                'expression' => '(http.request.uri.path ne "/") and not http.request.uri.path contains "."',
                'action_parameters' => ['cache' => false],
            ],
            [
                'action' => 'set_cache_settings',
                'description' => 'Saat — hashed static assets (JS/CSS/fonts)',
                'enabled' => true,
                'expression' => '(http.request.uri.path.extension in {"js" "css" "woff" "woff2" "ttf" "eot" "webp" "png" "jpg" "jpeg" "gif" "ico" "svg"})',
                'action_parameters' => [
                    'cache' => true,
                    'edge_ttl' => ['mode' => 'override_origin', 'default' => 2592000],
                    'browser_ttl' => ['mode' => 'override_origin', 'default' => 2592000],
                ],
            ],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rules
     * @return array{id: string, ok: bool, detail: string}
     */
    private function applyCacheRules(string $token, string $zoneId, array $rules): array
    {
        try {
            $entryUrl = "https://api.cloudflare.com/client/v4/zones/{$zoneId}/rulesets/phases/".self::PHASE.'/entrypoint';

            $put = Http::withToken($token)->acceptJson()->timeout(45)->put($entryUrl, ['rules' => $rules]);

            if ($put->status() === 404) {
                $post = Http::withToken($token)->acceptJson()->timeout(45)
                    ->post("https://api.cloudflare.com/client/v4/zones/{$zoneId}/rulesets", [
                        'name' => 'Saat cache rules',
                        'kind' => 'zone',
                        'phase' => self::PHASE,
                        'rules' => $rules,
                    ]);

                if (! $post->successful() || ! ($post->json('success') ?? false)) {
                    $err = $post->json('errors.0.message') ?? ('HTTP '.$post->status());

                    return ['id' => 'cache_rules', 'ok' => false, 'detail' => $err];
                }
            } elseif (! $put->successful() || ! ($put->json('success') ?? false)) {
                $err = $put->json('errors.0.message') ?? ('HTTP '.$put->status());

                return ['id' => 'cache_rules', 'ok' => false, 'detail' => $err];
            }

            return [
                'id' => 'cache_rules',
                'ok' => true,
                'detail' => count($rules).' قانون Cache Rules اعمال شد',
            ];
        } catch (\Throwable $e) {
            return ['id' => 'cache_rules', 'ok' => false, 'detail' => $e->getMessage()];
        }
    }
}
