<?php

declare(strict_types=1);

use TelegramHost\Account\AccountCache;
use TelegramHost\Bot;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Db\Connection;
use TelegramHost\Handlers\CallbackQueryHandler;
use TelegramHost\Handlers\MessageHandler;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Routing\DelegationDetector;
use TelegramHost\Routing\UpdateRouter;
use TelegramHost\Services\MainMenu;
use TelegramHost\Services\MembershipGate;
use TelegramHost\Services\PurchaseFlow;
use TelegramHost\Telegram\BotApiClient;

$config = require __DIR__.'/../bootstrap.php';

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

// Ack Telegram immediately — processing continues after response (faster UX).
http_response_code(200);
echo 'ok';

if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
}

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $live = new LiveClient($sync);
    $cache = new SyncCache($pdo, $sync);
    $accounts = new AccountCache($pdo);
    $conversations = new ConversationRepository($pdo);
    $api = new BotApiClient((string) $config['bot_token']);
    $siteBaseUrl = rtrim((string) ($config['site_base_url'] ?? 'https://rostami.app'), '/');

    $mainMenu = new MainMenu($cache, $accounts);
    $membership = new MembershipGate($cache, $api);
    $purchaseFlow = new PurchaseFlow($api, $live, $cache, $conversations, $mainMenu);

    $messageHandler = new MessageHandler(
        $api,
        $cache,
        $sync,
        $live,
        $conversations,
        $accounts,
        $mainMenu,
        $membership,
        $purchaseFlow,
        $siteBaseUrl,
    );

    $callbackHandler = new CallbackQueryHandler(
        $api,
        $cache,
        $live,
        $conversations,
        $accounts,
        $mainMenu,
        $membership,
        $purchaseFlow,
        $messageHandler,
        $siteBaseUrl,
    );

    $router = new UpdateRouter(
        new DelegationDetector($accounts, $conversations),
        $live,
        $sync,
        $accounts,
        $cache,
        $api,
        $messageHandler,
        $callbackHandler,
    );

    (new Bot($router))->handle($update);
} catch (\Throwable $e) {
    error_log('[telegram-host] '.$e->getMessage());
}
