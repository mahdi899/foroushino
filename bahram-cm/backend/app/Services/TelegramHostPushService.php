<?php

namespace App\Services;

use App\Support\AesGcmCipher;
use App\Support\HmacSigner;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pushes cache-invalidation / account-sync commands from the main Laravel
 * server to the external Telegram "host" app (telegram/ on cPanel).
 */
class TelegramHostPushService
{
    public const PUSH_ORIGIN = 'Main-Server';

    public function __construct(private readonly TelegramHostPushState $pushState) {}

    public function refreshBootstrap(): bool
    {
        return $this->runAction('refresh_bootstrap');
    }

    public function refreshCatalog(): bool
    {
        return $this->runAction('refresh_catalog');
    }

    public function refreshAll(): bool
    {
        return $this->runAction('refresh_all');
    }

    /** @param  array<string, mixed>  $account */
    public function pushAccount(array $account): bool
    {
        return $this->runAction('push_account', ['account' => $account]);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    public function runAction(string $action, array $extra = []): bool
    {
        if ($action === 'push_account') {
            $result = $this->request('push_account', $extra);
        } else {
            $result = $this->request($action);
        }

        if ($result !== null && ($result['ok'] ?? false)) {
            $this->pushState->clear();

            return true;
        }

        if ($action !== 'push_account') {
            $this->pushState->markPending($action);
        }

        return false;
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

            $timeout = match ($action) {
                'register_webhook' => 45,
                'push_account' => 25,
                'refresh_catalog', 'refresh_bootstrap' => 20,
                default => 30,
            };

            $response = Http::timeout($timeout)
                ->connectTimeout(8)
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
