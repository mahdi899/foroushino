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

    /** @param  array<string, mixed>  $extra */
    private function push(string $action, array $extra = []): void
    {
        $infra = app(TelegramInfrastructureService::class);

        if (! $infra->usesHostBridge()) {
            return;
        }

        $hostBase = rtrim($infra->panelBaseUrl(), '/');
        $hmacSecret = $infra->hostSyncSecret();
        $aesKey = $infra->hostEncryptionKey();

        if ($hostBase === '' || $hmacSecret === null || $aesKey === null) {
            return;
        }

        $payload = array_merge(['action' => $action, 'sent_at' => now()->toIso8601String()], $extra);
        $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return;
        }

        try {
            $encrypted = AesGcmCipher::encrypt($json, $aesKey);
            $headers = HmacSigner::headersFor(['body' => $encrypted], $hmacSecret);

            $response = Http::timeout(8)
                ->withHeaders(array_merge($headers, [
                    'Authorization' => 'Bearer '.$hmacSecret,
                    'X-Proxy-Origin' => self::PUSH_ORIGIN,
                    'Content-Type' => 'text/plain',
                ]))
                ->withBody($encrypted, 'text/plain')
                ->post($hostBase.'/internal/sync.php');

            if (! $response->successful()) {
                Log::channel('telegram')->warning('Telegram host push failed.', [
                    'action' => $action,
                    'status' => $response->status(),
                    'host' => $hostBase,
                ]);
            }
        } catch (\Throwable $e) {
            Log::channel('telegram')->warning('Telegram host push exception.', [
                'action' => $action,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
