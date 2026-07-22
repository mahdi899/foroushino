<?php

namespace App\Services;

use App\Support\AesGcmCipher;
use App\Support\HmacSigner;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pushes cache-invalidation / account-sync commands from the main Laravel
 * server to the external Telegram "host" app (telegram/ on cPanel).
 *
 * Uses the same HMAC + AES-256-GCM wire format as host→server sync, but in
 * the opposite direction. The host verifies these at public/internal/sync.php.
 */
class TelegramHostPushService
{
    public const PUSH_ORIGIN = 'Main-Server';

    public function refreshBootstrap(): void
    {
        $this->push('refresh_bootstrap');
    }

    public function refreshCatalog(): void
    {
        $this->push('refresh_catalog');
    }

    public function refreshAll(): void
    {
        $this->push('refresh_all');
    }

    /** @param  array<string, mixed>  $account */
    public function pushAccount(array $account): void
    {
        $this->push('push_account', ['account' => $account]);
    }

    /**
     * Register Telegram webhook via the external host (Iran cannot call api.telegram.org).
     *
     * @return array{ok: bool, url?: string, error?: string}
     */
    public function registerWebhook(string $url, ?string $secret): array
    {
        $result = $this->request('register_webhook', [
            'url' => $url,
            'secret' => $secret ?? '',
        ]);

        if ($result === null) {
            return ['ok' => false, 'error' => 'host_unreachable'];
        }

        if (! ($result['ok'] ?? false)) {
            return [
                'ok' => false,
                'error' => (string) ($result['error'] ?? 'host_register_failed'),
            ];
        }

        return [
            'ok' => true,
            'url' => (string) ($result['url'] ?? $url),
        ];
    }

    /** @param  array<string, mixed>  $extra */
    private function push(string $action, array $extra = []): void
    {
        $this->request($action, $extra);
    }

    /**
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>|null
     */
    private function request(string $action, array $extra = []): ?array
    {
        $infra = app(TelegramInfrastructureService::class);

        if (! $infra->usesHostBridge()) {
            return null;
        }

        $hmacSecret = $infra->hostSyncSecret();
        $aesKey = $infra->hostEncryptionKey();

        if ($infra->hostPushUrl() === '' || $hmacSecret === null || $aesKey === null) {
            return null;
        }

        $payload = array_merge(['action' => $action, 'sent_at' => now()->toIso8601String()], $extra);
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return null;
        }

        try {
            $encrypted = AesGcmCipher::encrypt($json, $aesKey);
            $headers = HmacSigner::headersFor(['body' => $encrypted], $hmacSecret);

            $response = Http::timeout(12)
                ->withHeaders(array_merge($headers, [
                    'Authorization' => 'Bearer '.$hmacSecret,
                    'X-Proxy-Origin' => self::PUSH_ORIGIN,
                    'Content-Type' => 'text/plain',
                ]))
                ->withBody($encrypted, 'text/plain')
                ->post($infra->hostPushUrl());

            if (! $response->successful()) {
                Log::channel('telegram')->warning('Telegram host push failed.', [
                    'action' => $action,
                    'status' => $response->status(),
                    'host' => $infra->hostAppBaseUrl(),
                    'body' => mb_substr((string) $response->body(), 0, 500),
                ]);

                return ['ok' => false, 'error' => 'http_'.$response->status()];
            }

            $decoded = json_decode((string) $response->body(), true);

            return is_array($decoded) ? $decoded : ['ok' => true];
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('Telegram host push exception.', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);

            return ['ok' => false, 'error' => $e->getMessage()];
        }
    }
}
