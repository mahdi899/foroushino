<?php

declare(strict_types=1);

/**
 * Register Telegram webhook directly on this host (bypasses Iran → host-sync push).
 * Use when the main server cannot reach host-sync.php in time but this host can
 * reach api.telegram.org.
 *
 *   GET register-webhook.php?token=<webhook_secret from config.php>
 *
 * Delete after use, or keep protected by the secret like diagnose.php.
 */

use TelegramHost\Telegram\BotApiClient;

$config = require __DIR__.'/../bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');

$token = (string) ($_GET['token'] ?? '');
if (! hash_equals((string) $config['webhook_secret'], $token) || $token === '') {
    http_response_code(403);
    echo "Forbidden.\nUsage: register-webhook.php?token=<webhook_secret from config.php>\n";
    exit;
}

$base = rtrim((string) ($config['host_public_url'] ?? ''), '/');
$url = $base !== '' ? $base.'/public/webhook.php' : '';
if ($url === '') {
    http_response_code(500);
    echo "host_public_url is empty in config.php\n";
    exit;
}

$botToken = trim((string) ($config['bot_token'] ?? ''));
if ($botToken === '') {
    http_response_code(500);
    echo "bot_token is empty in config.php\n";
    exit;
}

$secret = trim((string) ($config['webhook_secret'] ?? ''));

try {
    (new BotApiClient($botToken))->setWebhook($url, $secret !== '' ? $secret : null);
    echo "OK — webhook set to:\n{$url}\n";
} catch (\Throwable $e) {
    http_response_code(500);
    echo 'setWebhook failed: '.$e->getMessage()."\n";
}
