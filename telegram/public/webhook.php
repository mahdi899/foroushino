<?php

declare(strict_types=1);

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Bot;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Db\Connection;
use TelegramHost\Handlers\CallbackQueryHandler;
use TelegramHost\Handlers\MessageHandler;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\BackgroundIranRelay;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Routing\DelegationDetector;
use TelegramHost\Routing\UpdateRouter;
use TelegramHost\Security\RateLimiter;
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

    $senderId = (int) (
        $update['message']['from']['id']
        ?? $update['edited_message']['from']['id']
        ?? $update['callback_query']['from']['id']
        ?? $update['chat_join_request']['from']['id']
        ?? $update['my_chat_member']['from']['id']
        ?? 0
    );

    if ($senderId > 0) {
        $limiter = new RateLimiter($pdo);
        if ($limiter->tooManyRequests($senderId)) {
            // Silently drop — Telegram already got its 200 OK, no retries triggered.
            exit;
        }
    }

    // Hard cap free text before it reaches any handler/DB/relay — blocks
    // oversized payloads (e.g. multi-MB "text" fields) some abusive clients send.
    foreach (['message', 'edited_message'] as $key) {
        if (isset($update[$key]['text']) && is_string($update[$key]['text'])) {
            $update[$key]['text'] = mb_substr($update[$key]['text'], 0, 4000);
        }
        if (isset($update[$key]['caption']) && is_string($update[$key]['caption'])) {
            $update[$key]['caption'] = mb_substr($update[$key]['caption'], 0, 1024);
        }
    }

    $sync = new SyncClient($config);
    $liveClient = new LiveClient($sync);
    $iranQueue = new IranUpdateQueue($pdo);
    $cache = new SyncCache($pdo, $sync, $config);
    $accounts = new AccountCache($pdo);
    $conversations = new ConversationRepository($pdo);
    $api = new BotApiClient((string) $config['bot_token']);

    $reporter = new \TelegramHost\Services\IranFailureReporter($api, $cache, $accounts, $config);
    $live = new ResilientLiveClient($liveClient, $api, $reporter);
    $iranSync = new \TelegramHost\Routing\IranSyncRelay($liveClient, $api, $iranQueue, $reporter);

    $maxRelay = max(0, (int) ($config['iran_relay_per_webhook'] ?? 2));
    $iranRelay = new BackgroundIranRelay($iranQueue, $liveClient, $sync, maxPerRun: $maxRelay);
    $membershipCache = new \TelegramHost\Services\MembershipCheckCache(
        $pdo,
        max(300, (int) ($config['membership_cache_ttl_seconds'] ?? 900)),
    );
    $siteBaseUrl = rtrim((string) ($config['site_base_url'] ?? 'https://rostami.app'), '/');

    $mainMenu = new MainMenu($cache, $accounts);
    $registration = new HostRegistrationFlow($sync, $api, $accounts, $conversations, $mainMenu, $cache);
    $membership = new MembershipGate($cache, $api, $membershipCache);
    $purchaseFlow = new PurchaseFlow($api, $live, $cache, $conversations, $mainMenu);

    $messageHandler = new MessageHandler(
        $api,
        $cache,
        $live,
        $conversations,
        $accounts,
        $mainMenu,
        $membership,
        $purchaseFlow,
        $registration,
        $siteBaseUrl
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
        $registration,
    );

    $accountSync = new AccountSyncCoordinator($accounts, $sync);

    $router = new UpdateRouter(
        new DelegationDetector($accounts, $conversations),
        $iranSync,
        $accounts,
        $accountSync,
        $cache,
        $api,
        $messageHandler,
        $callbackHandler,
    );

    (new Bot($router))->handle($update);

    try {
        (new \TelegramHost\Services\HostBackgroundSync($cache, $sync, $accounts))->refreshForUser($senderId);
    } catch (\Throwable $e) {
        error_log('[telegram-host] bg sync: '.$e->getMessage());
    }

    try {
        $iranRelay->drain();
    } catch (\Throwable $e) {
        error_log('[telegram-host] iran relay: '.$e->getMessage());
    }
} catch (\Throwable $e) {
    error_log('[telegram-host] '.$e->getMessage());
}
