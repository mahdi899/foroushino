<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Http\SyncClient;
use TelegramHost\Telegram\BotApiClient;

/**
 * When the Iran server cannot reach host-sync.php, the panel queues webhook
 * registration; bootstrap includes webhook_register and we apply it here.
 */
final class WebhookRegisterFromPull
{
    /** @param array<string, mixed> $config */
    public function __construct(private readonly array $config) {}

    /** @param array<string, mixed> $bootstrap */
    public function processIfRequested(array $bootstrap, SyncClient $sync): void
    {
        $req = $bootstrap['webhook_register'] ?? null;
        if (! is_array($req)) {
            return;
        }

        $nonce = trim((string) ($req['nonce'] ?? ''));
        $url = trim((string) ($req['url'] ?? ''));
        if ($nonce === '' || $url === '') {
            return;
        }

        $secret = trim((string) ($req['secret'] ?? ''));
        if ($secret === '') {
            $secret = trim((string) ($this->config['webhook_secret'] ?? ''));
        }

        $token = trim((string) ($this->config['bot_token'] ?? ''));
        if ($token === '') {
            throw new \RuntimeException('missing_bot_token');
        }

        (new BotApiClient($token))->setWebhook($url, $secret !== '' ? $secret : null);

        // Ack is best-effort — never block host-sync on Iran reachability.
        try {
            $sync->call('webhook-register/ack', ['nonce' => $nonce]);
        } catch (\Throwable $e) {
            error_log('[telegram-host] webhook-register ack failed: '.$e->getMessage());
        }
    }
}
