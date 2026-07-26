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
     * Instant user message on the external host (Bot API from host — no cron).
     *
     * @param  array<string, mixed>  $options  Telegram sendMessage options
     */
    public function notifyUser(int $telegramUserId, string $text, array $options = []): bool
    {
        if ($telegramUserId <= 0 || trim($text) === '') {
            return false;
        }

        return $this->runAction('notify_user', [
            'telegram_user_id' => $telegramUserId,
            'text' => $text,
            'options' => $options,
        ]);
    }

    /**
     * @param  array<string, mixed>  $account
     * @param  array{text: string, options?: array<string, mixed>}  $notification
     */
    public function pushAccountWithNotification(array $account, array $notification): bool
    {
        return $this->runAction('push_account', [
            'account' => $account,
            'notification' => $notification,
        ]);
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    public function runAction(string $action, array $extra = []): bool
    {
        if ($action === 'push_account' || $action === 'notify_user') {
            $result = $this->request($action, $extra);
        } else {
            $result = $this->request($action);
        }

        if ($result !== null && ($result['ok'] ?? false)) {
            $this->pushState->clear();
            $this->pushState->recordSuccess();

            return true;
        }

        if ($action !== 'push_account') {
            $this->pushState->markPending($action);
        }

        // Only count real network failures (host unreachable/timeout) toward
        // the circuit breaker — a skipped call ($result === null because the
        // circuit was already open) must not extend the cooldown further.
        if ($result !== null) {
            $this->pushState->recordFailure();
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
     * Force plain HTTP for the Iran → host push call. The host's firewall
     * (Imunify360/CSF, most likely) blackholes HTTPS from this server's IP
     * while HTTP answers normally; the payload itself stays encrypted.
     */
    private function transportUrl(string $url): string
    {
        return preg_replace('#^https://#i', 'http://', $url) ?? $url;
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

        // The host's firewall silently drops HTTPS (port 443) connections
        // from this server's IP (confirmed: TLS handshake completes, then
        // the request just hangs — plain HTTP on port 80 answers instantly).
        // The body is already AES-256-GCM encrypted and HMAC-signed at the
        // application layer, so downgrading transport for this one internal
        // endpoint does not weaken confidentiality/integrity.
        $pushUrl = $this->transportUrl($infra->hostPushUrl());

        // Circuit breaker: after repeated timeouts (host firewall blocking us,
        // host down, etc.) skip the network call for a short cooldown instead
        // of blocking the caller (registration, order notify, queue worker)
        // for the full HTTP timeout on every single attempt.
        if ($this->pushState->isCircuitOpen() && $action !== 'register_webhook') {
            Log::channel('telegram')->info('Telegram host push skipped — circuit open.', [
                'action' => $action,
                'retry_in_seconds' => $this->pushState->secondsUntilRetry(),
            ]);

            if ($action !== 'push_account') {
                $this->pushState->markPending($action);
            }

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

            // The host normally answers in well under 1s. Long timeouts here
            // only turn a blocked/unreachable host into a multi-second hang
            // for the Telegram user (registration, order notify, etc.).
            $timeout = match ($action) {
                'register_webhook' => 20,
                'notify_user' => 8,
                'push_account' => 8,
                'refresh_catalog', 'refresh_bootstrap' => 8,
                default => 10,
            };

            $response = Http::timeout($timeout)
                ->connectTimeout(5)
                ->withHeaders(array_merge($headers, [
                    'Authorization' => 'Bearer '.$hmacSecret,
                    'X-Proxy-Origin' => self::PUSH_ORIGIN,
                    'Content-Type' => 'text/plain',
                ]))
                ->withBody($encrypted, 'text/plain')
                ->post($pushUrl);

            if (! $response->successful()) {
                Log::channel('telegram')->warning('Telegram host push failed.', [
                    'action' => $action,
                    'status' => $response->status(),
                    'host' => $pushUrl,
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
