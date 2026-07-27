<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Pushes cache-invalidation / account-sync commands from the main Laravel
 * server to the external Telegram "host" app (telegram/ on cPanel).
 */
class TelegramHostPushService
{
    public const PUSH_ORIGIN = 'Main-Server';

    public function __construct(
        private readonly TelegramHostPushState $pushState,
        private readonly TelegramHostPayloadBuilder $payloadBuilder,
    ) {}

    /**
     * Refresh actions embed the actual data in the push itself — the host
     * used to call back to Iran (`SyncClient::call('bootstrap')`) to fetch
     * it after acking the push, which turned a single push into two network
     * hops and, whenever that callback timed out, produced a malformed
     * (double-JSON) 500 response on the host and left its cache stale. See
     * `telegram/src/Http/InboundSyncHandler.php`.
     */
    public function refreshBootstrap(): bool
    {
        $bootstrap = $this->buildBootstrapPayloadOrFail();
        if ($bootstrap === null) {
            return false;
        }

        return $this->runAction('refresh_bootstrap', ['bootstrap' => $bootstrap]);
    }

    public function refreshCatalog(): bool
    {
        return $this->runAction('refresh_catalog', ['catalog' => $this->payloadBuilder->catalogPayload()]);
    }

    public function refreshAll(): bool
    {
        $bootstrap = $this->buildBootstrapPayloadOrFail();
        if ($bootstrap === null) {
            return false;
        }

        return $this->runAction('refresh_all', [
            'bootstrap' => $bootstrap,
            'catalog' => $this->payloadBuilder->catalogPayload(),
        ]);
    }

    /**
     * @return array<string, mixed>|null null when the production bot isn't
     *  configured — never push an empty/blank bootstrap over a good one.
     */
    private function buildBootstrapPayloadOrFail(): ?array
    {
        try {
            return $this->payloadBuilder->bootstrapPayload();
        } catch (\RuntimeException $e) {
            Log::channel('telegram')->error('Telegram host push aborted — refusing to push empty bootstrap.', [
                'error' => $e->getMessage(),
            ]);

            return null;
        }
    }

    /** @param  array<string, mixed>  $account */
    public function pushAccount(array $account): bool
    {
        return $this->runAction('push_account', ['account' => $account]);
    }

    /**
     * Pre-provisions access on the host for a buyer who purchased on the
     * website but has never started this bot — keyed by mobile number so
     * the host can grant access the instant they finally do /start (see
     * PendingMobileAccess + HostRegistrationFlow::contact() on the host).
     *
     * @param  list<int>  $ownedProductIds
     */
    public function pushMobileAccess(string $mobile, array $ownedProductIds, ?string $displayName = null): bool
    {
        if (trim($mobile) === '' || $ownedProductIds === []) {
            return false;
        }

        return $this->runAction('push_mobile_access', [
            'mobile' => $mobile,
            'owned_product_ids' => array_values($ownedProductIds),
            'display_name' => $displayName,
        ]);
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
        $result = $this->request($action, $extra);

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

        if ($infra->hostPushUrl() === '' || $hmacSecret === null) {
            return null;
        }

        $pushUrl = $infra->hostPushUrl();

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

        $timeout = match ($action) {
            'register_webhook' => 20,
            'notify_user' => 8,
            'push_account' => 8,
            'refresh_catalog', 'refresh_bootstrap' => 8,
            default => 10,
        };

        try {
            $response = Http::timeout($timeout)
                ->connectTimeout(5)
                ->withHeaders([
                    'Authorization' => 'Bearer '.$hmacSecret,
                    'X-Proxy-Origin' => self::PUSH_ORIGIN,
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ])
                ->withBody($json, 'application/json')
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
