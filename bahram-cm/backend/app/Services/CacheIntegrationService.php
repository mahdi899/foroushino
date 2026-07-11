<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * ISR webhook + CDN credentials (Arvan / Cloudflare) — panel-managed with .env fallback.
 */
class CacheIntegrationService
{
    public const GROUP = 'cache';

    public const KEY = 'integrations';

    private const CACHE_KEY = 'cache.integrations.config';

    public function __construct(private readonly SettingService $settings) {}

    /** @return array{revalidate_webhook_url?: string, revalidate_secret?: string, cloudflare_zone_id?: string, cloudflare_api_token?: string, arvan_api_key?: string, arvan_domain?: string, arvan_media_domain?: string} */
    private function stored(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            $raw = Setting::query()
                ->where('group', self::GROUP)
                ->where('key', self::KEY)
                ->value('value');

            return is_array($raw) ? $raw : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function revalidateWebhookUrl(): ?string
    {
        $stored = trim((string) ($this->stored()['revalidate_webhook_url'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.revalidate.webhook_url', ''));
        if ($env !== '') {
            return $env;
        }

        $frontend = rtrim((string) config('bahram.frontend_url', ''), '/');

        return $frontend !== '' ? $frontend.'/api/revalidate' : null;
    }

    public function revalidateSecret(): ?string
    {
        $stored = trim((string) ($this->stored()['revalidate_secret'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.revalidate.secret', ''));

        return $env !== '' ? $env : null;
    }

    public function cloudflareZoneId(): ?string
    {
        $stored = trim((string) ($this->stored()['cloudflare_zone_id'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.cloudflare.zone_id', ''));

        return $env !== '' ? $env : null;
    }

    public function cloudflareApiToken(): ?string
    {
        $stored = trim((string) ($this->stored()['cloudflare_api_token'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.cloudflare.api_token', ''));

        return $env !== '' ? $env : null;
    }

    public function arvanApiKey(): ?string
    {
        $stored = trim((string) ($this->stored()['arvan_api_key'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.arvan.api_key', ''));

        return $env !== '' ? $env : null;
    }

    public function arvanDomain(): ?string
    {
        $stored = trim((string) ($this->stored()['arvan_domain'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.arvan.domain', ''));

        return $env !== '' ? $env : null;
    }

    public function arvanMediaDomain(): ?string
    {
        $stored = trim((string) ($this->stored()['arvan_media_domain'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('bahram.arvan.media_domain', ''));

        return $env !== '' ? $env : null;
    }

    public function webhookConfigured(): bool
    {
        return (bool) ($this->revalidateWebhookUrl() && $this->revalidateSecret());
    }

    /** Persist default ISR webhook credentials in local dev when missing. */
    public function ensureLocalDefaults(): void
    {
        if (! app()->environment('local') || $this->webhookConfigured()) {
            return;
        }

        $frontend = rtrim((string) config('bahram.frontend_url', 'http://localhost:3000'), '/');
        $secret = trim((string) config('bahram.revalidate.secret', ''));

        $this->update([
            'revalidate_webhook_url' => $frontend.'/api/revalidate',
            'revalidate_secret_input' => $secret !== '' ? $secret : 'bahram-dev-revalidate-secret',
        ]);
    }

    public function cloudflareConfigured(): bool
    {
        return (bool) ($this->cloudflareZoneId() && $this->cloudflareApiToken());
    }

    public function arvanConfigured(): bool
    {
        return (bool) ($this->arvanApiKey() && $this->arvanDomain());
    }

    /** @return 'arvan'|'cloudflare'|'none' */
    public function cdnProvider(): string
    {
        $stored = strtolower(trim((string) ($this->stored()['cdn_provider'] ?? '')));
        if (in_array($stored, ['arvan', 'cloudflare', 'none'], true)) {
            return $stored;
        }

        $env = strtolower(trim((string) config('bahram.cdn_provider', 'none')));
        if (in_array($env, ['arvan', 'cloudflare'], true)) {
            return $env;
        }

        return 'none';
    }

    /** Active provider with valid credentials, or null. */
    public function activeCdnProvider(): ?string
    {
        return match ($this->cdnProvider()) {
            'arvan' => $this->arvanConfigured() ? 'arvan' : null,
            'cloudflare' => $this->cloudflareConfigured() ? 'cloudflare' : null,
            default => null,
        };
    }

    public function cdnActiveConfigured(): bool
    {
        return $this->activeCdnProvider() !== null;
    }

    public function cdnProviderLabel(): string
    {
        return match ($this->cdnProvider()) {
            'arvan' => 'ابر آروان',
            'cloudflare' => 'Cloudflare',
            default => 'غیرفعال',
        };
    }

    private function maskSecret(string $value): string
    {
        $trimmed = trim($value);
        if ($trimmed === '') {
            return '';
        }
        if (strlen($trimmed) <= 8) {
            return '••••••••';
        }

        return substr($trimmed, 0, 7).'…'.substr($trimmed, -4);
    }

    /** Admin-safe view (no raw secrets). */
    public function adminView(): array
    {
        $stored = $this->stored();
        $panelSecret = trim((string) ($stored['revalidate_secret'] ?? ''));
        $panelToken = trim((string) ($stored['cloudflare_api_token'] ?? ''));
        $panelArvanKey = trim((string) ($stored['arvan_api_key'] ?? ''));

        $envWebhook = trim((string) config('bahram.revalidate.webhook_url', ''));
        $envSecret = trim((string) config('bahram.revalidate.secret', ''));
        $envZone = trim((string) config('bahram.cloudflare.zone_id', ''));
        $envToken = trim((string) config('bahram.cloudflare.api_token', ''));
        $envArvanKey = trim((string) config('bahram.arvan.api_key', ''));
        $envArvanDomain = trim((string) config('bahram.arvan.domain', ''));
        $envArvanMedia = trim((string) config('bahram.arvan.media_domain', ''));
        $envCdnProvider = strtolower(trim((string) config('bahram.cdn_provider', '')));

        $defaultWebhook = rtrim((string) config('bahram.frontend_url', 'http://localhost:3000'), '/').'/api/revalidate';
        $provider = $this->cdnProvider();

        return [
            'revalidate_webhook_url' => $this->revalidateWebhookUrl() ?? '',
            'default_webhook_url' => $defaultWebhook,
            'has_revalidate_secret' => (bool) $this->revalidateSecret(),
            'revalidate_secret_preview' => $this->revalidateSecret() ? $this->maskSecret($this->revalidateSecret()) : null,
            'cdn_provider' => $provider,
            'cdn_provider_label' => $this->cdnProviderLabel(),
            'cdn_active_configured' => $this->cdnActiveConfigured(),
            'active_cdn_provider' => $this->activeCdnProvider(),
            'cloudflare_zone_id' => $this->cloudflareZoneId() ?? '',
            'has_cloudflare_api_token' => (bool) $this->cloudflareApiToken(),
            'cloudflare_api_token_preview' => $this->cloudflareApiToken() ? $this->maskSecret($this->cloudflareApiToken()) : null,
            'webhook_configured' => $this->webhookConfigured(),
            'cloudflare_configured' => $this->cloudflareConfigured(),
            'arvan_domain' => $this->arvanDomain() ?? '',
            'arvan_media_domain' => $this->arvanMediaDomain() ?? '',
            'has_arvan_api_key' => (bool) $this->arvanApiKey(),
            'arvan_api_key_preview' => $this->arvanApiKey() ? $this->maskSecret($this->arvanApiKey()) : null,
            'arvan_configured' => $this->arvanConfigured(),
            'env_fallback' => [
                'revalidate_webhook_url' => $envWebhook !== '' && empty($stored['revalidate_webhook_url']),
                'revalidate_secret' => $envSecret !== '' && $panelSecret === '',
                'cloudflare_zone_id' => $envZone !== '' && empty($stored['cloudflare_zone_id']),
                'cloudflare_api_token' => $envToken !== '' && $panelToken === '',
                'arvan_domain' => $envArvanDomain !== '' && empty($stored['arvan_domain']),
                'arvan_media_domain' => $envArvanMedia !== '' && empty($stored['arvan_media_domain']),
                'arvan_api_key' => $envArvanKey !== '' && $panelArvanKey === '',
                'cdn_provider' => $envCdnProvider !== '' && empty($stored['cdn_provider']),
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function update(array $input): array
    {
        $current = $this->stored();
        $next = $current;

        if (array_key_exists('revalidate_webhook_url', $input)) {
            $next['revalidate_webhook_url'] = trim((string) $input['revalidate_webhook_url']);
        }

        if (array_key_exists('revalidate_secret_input', $input)) {
            $secret = trim((string) $input['revalidate_secret_input']);
            if ($secret !== '') {
                $next['revalidate_secret'] = $secret;
            }
        }

        if (array_key_exists('cloudflare_zone_id', $input)) {
            $next['cloudflare_zone_id'] = trim((string) $input['cloudflare_zone_id']);
        }

        if (array_key_exists('cloudflare_api_token_input', $input)) {
            $token = trim((string) $input['cloudflare_api_token_input']);
            if ($token !== '') {
                $next['cloudflare_api_token'] = $token;
            }
        }

        if (array_key_exists('arvan_domain', $input)) {
            $next['arvan_domain'] = trim((string) $input['arvan_domain']);
        }

        if (array_key_exists('arvan_media_domain', $input)) {
            $next['arvan_media_domain'] = trim((string) $input['arvan_media_domain']);
        }

        if (array_key_exists('arvan_api_key_input', $input)) {
            $key = trim((string) $input['arvan_api_key_input']);
            if ($key !== '') {
                $next['arvan_api_key'] = $key;
            }
        }

        if (array_key_exists('cdn_provider', $input)) {
            $provider = strtolower(trim((string) $input['cdn_provider']));
            $next['cdn_provider'] = in_array($provider, ['arvan', 'cloudflare', 'none'], true) ? $provider : 'none';
        }

        $this->settings->updateGroup(self::GROUP, [self::KEY => $next]);
        self::forgetCachedConfig();

        return $this->adminView();
    }

    public function verifyRevalidateSecret(string $secret): bool
    {
        $expected = $this->revalidateSecret();
        if (! $expected) {
            return false;
        }

        return hash_equals($expected, $secret);
    }

    /** @return array{ok: bool, message: string} */
    public function testWebhook(): array
    {
        $url = $this->revalidateWebhookUrl();
        $secret = $this->revalidateSecret();
        if (! $url || ! $secret) {
            return ['ok' => false, 'message' => 'آدرس Webhook یا Secret تنظیم نشده است.'];
        }

        try {
            $res = Http::timeout(8)->post($url, [
                'secret' => $secret,
                'tags' => ['settings'],
                'paths' => [],
            ]);

            if ($res->successful()) {
                return ['ok' => true, 'message' => 'Webhook با موفقیت پاسخ داد (HTTP '.$res->status().').'];
            }

            return ['ok' => false, 'message' => 'Webhook خطا داد: HTTP '.$res->status()];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'اتصال به Webhook ناموفق: '.$e->getMessage()];
        }
    }

    /** @return array{ok: bool, message: string, zone_name?: string} */
    public function testCloudflare(): array
    {
        $zoneId = $this->cloudflareZoneId();
        $token = $this->cloudflareApiToken();
        if (! $zoneId || ! $token) {
            return ['ok' => false, 'message' => 'Zone ID یا API Token تنظیم نشده است.'];
        }

        try {
            $res = Http::withToken($token)
                ->timeout(10)
                ->get("https://api.cloudflare.com/client/v4/zones/{$zoneId}");

            if (! $res->successful()) {
                return ['ok' => false, 'message' => 'Cloudflare API خطا داد: HTTP '.$res->status()];
            }

            $json = $res->json();
            if (! ($json['success'] ?? false)) {
                $err = $json['errors'][0]['message'] ?? 'Unknown error';

                return ['ok' => false, 'message' => 'Cloudflare: '.$err];
            }

            $name = $json['result']['name'] ?? $zoneId;

            return ['ok' => true, 'message' => 'اتصال برقرار — Zone: '.$name, 'zone_name' => $name];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'اتصال به Cloudflare ناموفق: '.$e->getMessage()];
        }
    }

    /** @return array{ok: bool, message: string, domain?: string} */
    public function testArvan(): array
    {
        $domain = $this->arvanDomain();
        $apiKey = $this->arvanApiKey();
        if (! $domain || ! $apiKey) {
            return ['ok' => false, 'message' => 'دامنه یا API Key آروان تنظیم نشده است.'];
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Apikey '.$apiKey,
                'Accept' => 'application/json',
            ])
                ->timeout(10)
                ->withOptions(['allow_redirects' => false])
                ->get('https://napi.arvancloud.ir/cdn/4.0/domains/'.rawurlencode($domain).'/caching');

            if (! $res->successful()) {
                return ['ok' => false, 'message' => 'Arvan API خطا داد: HTTP '.$res->status()];
            }

            return ['ok' => true, 'message' => 'اتصال برقرار — دامنه: '.$domain, 'domain' => $domain];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'اتصال به Arvan ناموفق: '.$e->getMessage()];
        }
    }
}
