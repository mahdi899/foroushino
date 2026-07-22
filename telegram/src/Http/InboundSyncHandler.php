<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Support\AesGcmCipher;
use TelegramHost\Support\HmacVerifier;
use TelegramHost\Telegram\BotApiClient;

/**
 * Handles push commands from the main server (server → host).
 * Triggered via public/host-sync.php after HMAC + AES verification.
 */
final class InboundSyncHandler
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    /** @return array{ok: bool, action?: string, error?: string} */
    public function handle(string $encryptedBody, string $timestamp, string $nonce, string $signature, string $origin, string $bearer): array
    {
        $expectedOrigin = (string) ($this->config['server_push_origin'] ?? 'Main-Server');
        if (! hash_equals($expectedOrigin, $origin)) {
            return ['ok' => false, 'error' => 'invalid_origin'];
        }

        if (! hash_equals((string) $this->config['hmac_secret'], $bearer)) {
            return ['ok' => false, 'error' => 'invalid_bearer'];
        }

        $failure = HmacVerifier::verify($encryptedBody, $timestamp, $nonce, $signature, (string) $this->config['hmac_secret']);
        if ($failure !== null) {
            return ['ok' => false, 'error' => $failure];
        }

        $plaintext = $encryptedBody !== '' ? AesGcmCipher::decrypt($encryptedBody, (string) $this->config['aes_key']) : '{}';
        if ($plaintext === null) {
            return ['ok' => false, 'error' => 'decrypt_failed'];
        }

        $payload = json_decode($plaintext, true);
        if (! is_array($payload)) {
            return ['ok' => false, 'error' => 'invalid_payload'];
        }

        $action = (string) ($payload['action'] ?? 'refresh_all');
        $pdo = Connection::get($this->config);
        $sync = new SyncClient($this->config);
        $cache = new SyncCache($pdo, $sync);

        return match ($action) {
            'refresh_bootstrap' => $this->refreshBootstrap($cache),
            'refresh_catalog' => $this->refreshCatalog($cache),
            'refresh_all' => $this->refreshAll($cache),
            'push_account' => $this->pushAccount($pdo, $payload),
            'register_webhook' => $this->registerWebhook($payload),
            default => $this->refreshAll($cache),
        };
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
     * @return array{ok: bool, action: string, url?: string, error?: string}
     */
    private function registerWebhook(array $payload): array
    {
        $url = trim((string) ($payload['url'] ?? ''));
        if ($url === '') {
            $base = rtrim((string) ($this->config['host_public_url'] ?? ''), '/');
            $url = $base !== '' ? $base.'/public/webhook.php' : '';
        }

        if ($url === '') {
            return ['ok' => false, 'action' => 'register_webhook', 'error' => 'missing_webhook_url'];
        }

        $token = trim((string) ($this->config['bot_token'] ?? ''));
        if ($token === '') {
            return ['ok' => false, 'action' => 'register_webhook', 'error' => 'missing_bot_token'];
        }

        $secret = trim((string) ($payload['secret'] ?? ''));
        if ($secret === '') {
            $secret = trim((string) ($this->config['webhook_secret'] ?? ''));
        }

        try {
            (new BotApiClient($token))->setWebhook($url, $secret !== '' ? $secret : null);

            return ['ok' => true, 'action' => 'register_webhook', 'url' => $url];
        } catch (\Throwable $e) {
            return ['ok' => false, 'action' => 'register_webhook', 'error' => $e->getMessage()];
        }
    }
}
