<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\PendingMobileAccess;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Services\WebhookRegisterFromPull;
use TelegramHost\Support\HostBridgeConfig;
use TelegramHost\Telegram\BotApiClient;

/**
 * Handles push commands from the main server (server → host).
 * Triggered via public/host-sync.php after Bearer token verification.
 */
final class InboundSyncHandler
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    /**
     * @return array{ok: bool, action?: string, error?: string, defer?: bool, payload?: array<string, mixed>}
     */
    public function handle(string $rawBody, string $origin, string $bearer): array
    {
        $payload = $this->decodePayload($rawBody, $origin, $bearer);
        if (! ($payload['ok'] ?? false)) {
            return $payload;
        }

        /** @var array<string, mixed> $body */
        $body = $payload['payload'];
        $action = (string) ($body['action'] ?? 'refresh_all');

        if ($action === 'register_webhook') {
            return array_merge($this->registerWebhook($body), ['defer' => false]);
        }

        if ($action === 'notify_user') {
            return array_merge($this->deliverNotification($body), ['defer' => false]);
        }

        if ($action === 'push_account') {
            $account = (array) ($body['account'] ?? []);
            $telegramUserId = (int) ($account['telegram_user_id'] ?? 0);
            $notification = (array) ($body['notification'] ?? []);
            $notifyText = trim((string) ($notification['text'] ?? ''));
            if ($telegramUserId > 0 && $notifyText !== '') {
                $this->deliverNotification([
                    'telegram_user_id' => $telegramUserId,
                    'text' => $notifyText,
                    'options' => (array) ($notification['options'] ?? []),
                ]);
            }
        }

        // Bootstrap/catalog refreshes now carry the actual data in the push
        // itself (see App\Services\TelegramHostPayloadBuilder on Iran) — no
        // network call back to Iran is needed, so these run synchronously,
        // right here, instead of via the deferred/fastcgi_finish_request path.
        // That old path made a push into two network hops and, whenever the
        // callback timed out, produced a malformed 500 response and left the
        // host's cache stale.
        if (in_array($action, ['refresh_bootstrap', 'refresh_catalog', 'refresh_all'], true)) {
            return $this->handleRefreshSync($action, $body);
        }

        // Pre-provisioned access for a buyer who bought on the website but
        // has never started this bot — see TelegramHostAccountSync on Iran
        // and PendingMobileAccess/HostRegistrationFlow::contact() on the host.
        if ($action === 'push_mobile_access') {
            return $this->handlePushMobileAccess($body);
        }

        return [
            'ok' => true,
            'action' => $action,
            'defer' => true,
            'payload' => $body,
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, action?: string, error?: string, defer: bool}
     */
    private function handleRefreshSync(string $action, array $body): array
    {
        $pdo = Connection::get($this->config);
        $sync = new SyncClient($this->config);
        $cache = new SyncCache($pdo, $sync, $this->config);

        $hasBootstrap = is_array($body['bootstrap'] ?? null);
        $hasCatalog = is_array($body['catalog'] ?? null);

        if (! $hasBootstrap && ! $hasCatalog) {
            // Push must embed data. Do not pull Iran from host-sync (blocks /
            // double-hop). Iran should re-push with payload.
            error_log('[telegram-host] refresh sync ignored — no embedded bootstrap/catalog for '.$action);

            return [
                'ok' => false,
                'error' => 'missing_embedded_payload',
                'action' => $action,
                'defer' => false,
            ];
        }

        if ($hasBootstrap) {
            $bootstrap = (array) $body['bootstrap'];
            (new WebhookRegisterFromPull($this->config))->processIfRequested($bootstrap, $sync);
            $cache->storeBootstrapOnly($bootstrap);
        }

        if ($hasCatalog) {
            $cache->storeCatalogOnly((array) $body['catalog']);
        }

        return ['ok' => true, 'action' => $action, 'defer' => false];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{ok: bool, action: string, defer: bool}
     */
    private function handlePushMobileAccess(array $body): array
    {
        $mobile = trim((string) ($body['mobile'] ?? ''));
        if ($mobile === '') {
            return ['ok' => false, 'action' => 'push_mobile_access', 'defer' => false];
        }

        $ownedProductIds = array_values(array_map('intval', (array) ($body['owned_product_ids'] ?? [])));
        $displayName = trim((string) ($body['display_name'] ?? ''));

        $pdo = Connection::get($this->config);
        (new PendingMobileAccess($pdo))->store($mobile, $ownedProductIds, $displayName !== '' ? $displayName : null);

        return ['ok' => true, 'action' => 'push_mobile_access', 'defer' => false];
    }

    /** Run heavy sync after HTTP response was flushed to Iran. */
    public function runDeferred(string $action, array $body): void
    {
        $pdo = Connection::get($this->config);
        $sync = new SyncClient($this->config);
        $cache = new SyncCache($pdo, $sync, $this->config);

        if ($action === 'push_account') {
            $this->pushAccount($pdo, $body);

            return;
        }

        match ($action) {
            'refresh_bootstrap' => $this->refreshBootstrap($cache),
            'refresh_catalog' => $this->refreshCatalog($cache),
            'refresh_all' => $this->refreshAll($cache),
            default => $this->refreshAll($cache),
        };
    }

    /**
     * @return array{ok: bool, error?: string, payload?: array<string, mixed>}
     */
    private function decodePayload(string $rawBody, string $origin, string $bearer): array
    {
        $expectedOrigin = (string) ($this->config['server_push_origin'] ?? 'Main-Server');
        if (! hash_equals($expectedOrigin, $origin)) {
            return ['ok' => false, 'error' => 'invalid_origin'];
        }

        $token = HostBridgeConfig::syncToken($this->config);
        if ($token === '' || ! hash_equals($token, $bearer)) {
            return ['ok' => false, 'error' => 'invalid_bearer'];
        }

        if ($rawBody === '') {
            return ['ok' => false, 'error' => 'empty_body'];
        }

        $payload = json_decode($rawBody, true);

        return is_array($payload)
            ? ['ok' => true, 'payload' => $payload]
            : ['ok' => false, 'error' => 'invalid_payload'];
    }

    /** @return array{ok: bool, action: string} */
    private function refreshBootstrap(SyncCache $cache): array
    {
        $bootstrap = (new SyncClient($this->config))->call('bootstrap');
        $cache->storeBootstrapOnly($bootstrap);

        return ['ok' => true, 'action' => 'refresh_bootstrap'];
    }

    /** @return array{ok: bool, action: string} */
    private function refreshCatalog(SyncCache $cache): array
    {
        $catalog = (new SyncClient($this->config))->call('catalog');
        $cache->storeCatalogOnly($catalog);

        return ['ok' => true, 'action' => 'refresh_catalog'];
    }

    /** @return array{ok: bool, action: string} */
    private function refreshAll(SyncCache $cache): array
    {
        $cache->refreshAll();

        return ['ok' => true, 'action' => 'refresh_all'];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, action: string}
     */
    private function pushAccount(\PDO $pdo, array $payload): array
    {
        $account = (array) ($payload['account'] ?? []);
        $telegramUserId = (int) ($account['telegram_user_id'] ?? 0);
        if ($telegramUserId <= 0) {
            return ['ok' => false, 'action' => 'push_account'];
        }

        (new AccountCache($pdo))->store($telegramUserId, $account);

        return ['ok' => true, 'action' => 'push_account'];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, action: string, error?: string}
     */
    private function deliverNotification(array $payload): array
    {
        $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
        $text = trim((string) ($payload['text'] ?? ''));
        if ($telegramUserId <= 0 || $text === '') {
            return ['ok' => false, 'action' => 'notify_user', 'error' => 'invalid_payload'];
        }

        $api = new BotApiClient((string) $this->config['bot_token']);
        $options = (array) ($payload['options'] ?? []);
        if (! isset($options['parse_mode'])) {
            $options['parse_mode'] = 'HTML';
        }
        $api->sendMessage($telegramUserId, $text, $options);

        return ['ok' => true, 'action' => 'notify_user'];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, action: string, url?: string, error?: string}
     */
    private function registerWebhook(array $payload): array
    {
        $url = trim((string) ($payload['url'] ?? ''));
        if ($url === '') {
            return ['ok' => false, 'action' => 'register_webhook', 'error' => 'url_missing'];
        }

        $secret = (string) ($payload['secret'] ?? '');
        $api = new BotApiClient((string) $this->config['bot_token']);
        $api->setWebhook($url, $secret !== '' ? $secret : null);

        return ['ok' => true, 'action' => 'register_webhook', 'url' => $url];
    }
}
