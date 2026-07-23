<?php

namespace App\Services\Cloudflare;

use App\Models\AppSetting;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Panel-managed Cloudflare Zone ID + API Token (stored in app_settings).
 */
final class CloudflareIntegrationService
{
    private const ZONE_KEY = 'cloudflare_zone_id';

    private const TOKEN_KEY = 'cloudflare_api_token';

    public function zoneId(): ?string
    {
        $stored = trim(AppSetting::string(self::ZONE_KEY));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('saat.cloudflare.zone_id', ''));

        return $env !== '' ? $env : null;
    }

    public function apiToken(): ?string
    {
        $stored = trim(AppSetting::string(self::TOKEN_KEY));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('saat.cloudflare.api_token', ''));

        return $env !== '' ? $env : null;
    }

    public function configured(): bool
    {
        return (bool) ($this->zoneId() && $this->apiToken());
    }

    /**
     * @param  array<string, mixed>  $input
     */
    public function saveCredentials(array $input): void
    {
        $patch = [];

        if (array_key_exists('cloudflare_zone_id', $input)) {
            $patch[self::ZONE_KEY] = trim((string) $input['cloudflare_zone_id']);
        }

        if (array_key_exists('cloudflare_api_token_input', $input)) {
            $token = trim((string) $input['cloudflare_api_token_input']);
            if ($token !== '') {
                $patch[self::TOKEN_KEY] = $token;
            }
        }

        if ($patch !== []) {
            AppSetting::syncMany($patch);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function publicView(): array
    {
        $token = $this->apiToken();

        return [
            'cloudflare_zone_id' => $this->zoneId() ?? '',
            'cloudflare_configured' => $this->configured(),
            'has_cloudflare_api_token' => (bool) $token,
            'cloudflare_api_token_preview' => $token ? $this->maskSecret($token) : null,
            'cloudflare_dev_mode' => $this->configured() ? $this->fetchDevelopmentMode() : null,
        ];
    }

    /**
     * @return array{ok: bool, message: string, zone_name?: string}
     */
    public function testConnection(): array
    {
        $zoneId = $this->zoneId();
        $token = $this->apiToken();

        if (! $zoneId || ! $token) {
            return ['ok' => false, 'message' => 'Zone ID و API Token را وارد کنید.'];
        }

        try {
            $res = Http::withToken($token)
                ->acceptJson()
                ->timeout(30)
                ->get("https://api.cloudflare.com/client/v4/zones/{$zoneId}");

            if (! $res->successful()) {
                return ['ok' => false, 'message' => 'Cloudflare API خطا داد: HTTP '.$res->status()];
            }

            $json = $res->json();
            if (! ($json['success'] ?? false)) {
                $err = $json['errors'][0]['message'] ?? 'خطای ناشناخته';

                return ['ok' => false, 'message' => 'Cloudflare: '.$err];
            }

            $name = (string) ($json['result']['name'] ?? $zoneId);

            return ['ok' => true, 'message' => 'اتصال موفق — Zone: '.$name, 'zone_name' => $name];
        } catch (\Throwable $e) {
            return ['ok' => false, 'message' => 'اتصال ناموفق: '.$e->getMessage()];
        }
    }

    public function setDevelopmentMode(bool $on): bool
    {
        $zoneId = $this->zoneId();
        $token = $this->apiToken();
        if (! $zoneId || ! $token) {
            return false;
        }

        try {
            $res = Http::withToken($token)
                ->acceptJson()
                ->timeout(30)
                ->patch("https://api.cloudflare.com/client/v4/zones/{$zoneId}/settings/development_mode", [
                    'value' => $on ? 'on' : 'off',
                ]);

            return $res->successful() && ($res->json('success') ?? false);
        } catch (\Throwable $e) {
            Log::info('[cloudflare-dev-mode] failed: '.$e->getMessage());

            return false;
        }
    }

    public function fetchDevelopmentMode(): ?bool
    {
        $zoneId = $this->zoneId();
        $token = $this->apiToken();
        if (! $zoneId || ! $token) {
            return null;
        }

        try {
            $res = Http::withToken($token)
                ->acceptJson()
                ->timeout(20)
                ->get("https://api.cloudflare.com/client/v4/zones/{$zoneId}/settings/development_mode");

            if (! $res->successful() || ! ($res->json('success') ?? false)) {
                return null;
            }

            return ($res->json('result.value') ?? 'off') === 'on';
        } catch (\Throwable) {
            return null;
        }
    }

    private function maskSecret(string $secret): string
    {
        $len = strlen($secret);
        if ($len <= 8) {
            return str_repeat('•', $len);
        }

        return substr($secret, 0, 4).'…'.substr($secret, -4);
    }
}
