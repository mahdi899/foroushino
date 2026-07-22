<?php

declare(strict_types=1);

use TelegramHost\Account\AccountCache;
use TelegramHost\Bot;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Db\Connection;
use TelegramHost\Http\SyncClient;
use TelegramHost\Telegram\BotApiClient;

$config = require __DIR__.'/../bootstrap.php';

// Telegram sends this header on every webhook call — must match config('webhook_secret').
$secret = $_SERVER['HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN'] ?? '';
if (! hash_equals((string) $config['webhook_secret'], (string) $secret)) {
    http_response_code(403);
    exit;
}

$raw = file_get_contents('php://input');
$update = json_decode((string) $raw, true);

if (! is_array($update)) {
    http_response_code(400);
    exit;
}

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $bot = new Bot(
        api: new BotApiClient((string) $config['bot_token']),
        cache: new SyncCache($pdo, $sync),
        sync: $sync,
        conversations: new ConversationRepository($pdo),
        accounts: new AccountCache($pdo),
        siteBaseUrl: rtrim((string) ($config['site_base_url'] ?? 'https://rostami.app'), '/'),
    );

    $bot->handle($update);
} catch (\Throwable $e) {
    error_log('[telegram-host] '.$e->getMessage());
}

http_response_code(200);
echo 'ok';
