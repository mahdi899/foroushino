<?php

declare(strict_types=1);

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Account\PendingMobileAccess;
use TelegramHost\Bot;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Db\Connection;
use TelegramHost\Handlers\CallbackQueryHandler;
use TelegramHost\Handlers\MessageHandler;
use TelegramHost\Http\AdminFastClient;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\BackgroundIranRelay;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Routing\DelegationDetector;
use TelegramHost\Routing\UpdateRouter;
use TelegramHost\Security\RateLimiter;
use TelegramHost\Services\HostRegistrationFlow;
use TelegramHost\Services\MainMenu;
use TelegramHost\Services\MembershipGate;
use TelegramHost\Services\PurchaseFlow;
use TelegramHost\Services\ReferenceChannelFlow;
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
        $limit = $limiter->check($senderId);
        if ($limit['limited']) {
            if ($limit['should_notify']) {
                try {
                    $api = new BotApiClient((string) $config['bot_token']);
                    $api->sendMessage(
                        $senderId,
                        '⏱ به دلیل ارسال پیام زیاد، تا ۱ دقیقه محدود شدید. لطفاً کمی صبر کنید.',
                    );
                } catch (\Throwable $e) {
                    error_log('[telegram-host] rate-limit notice failed: '.$e->getMessage());
                }
            }
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
    $iranSync = new \TelegramHost\Routing\IranSyncRelay($liveClient, $api, $iranQueue, $reporter, $conversations);
    $adminFast = new AdminFastClient($sync, $config, $conversations);

    $maxRelay = max(1, (int) ($config['iran_relay_per_webhook'] ?? 2));
    $iranRelay = new BackgroundIranRelay($iranQueue, $liveClient, $sync, maxPerRun: $maxRelay);
    $membershipCache = new \TelegramHost\Services\MembershipCheckCache(
        $pdo,
        max(300, (int) ($config['membership_cache_ttl_seconds'] ?? 900)),
    );
    $siteBaseUrl = rtrim((string) ($config['site_base_url'] ?? 'https://rostami.app'), '/');

    $accountSync = new AccountSyncCoordinator($accounts, $sync);

    $mainMenu = new MainMenu($cache, $accounts);
    $pendingMobileAccess = new PendingMobileAccess($pdo);
    $registrationQueue = new \TelegramHost\Queue\PendingRegistrationSync($pdo);
    $registration = new HostRegistrationFlow($sync, $api, $accounts, $conversations, $mainMenu, $cache, $registrationQueue, $pendingMobileAccess);
    $membership = new MembershipGate($cache, $api, $membershipCache);
    $discountPreview = new \TelegramHost\Services\HostDiscountPreview($cache);
    $cardToCardFlow = new \TelegramHost\Services\HostCardToCardFlow($api, $cache, $live, $conversations, $accounts, $mainMenu);
    $purchaseFlow = new PurchaseFlow($api, $live, $cache, $conversations, $mainMenu, $discountPreview, $cardToCardFlow);
    $ticketSync = new \TelegramHost\Queue\PendingTicketSync($pdo);
    $supportForward = new \TelegramHost\Queue\PendingSupportForward($pdo);
    $support = new \TelegramHost\Services\HostSupportService($api, $cache, $conversations, $accounts, $mainMenu, $pdo, $ticketSync, $supportForward);
    $referenceChannel = new ReferenceChannelFlow($api, $cache, $accounts, $siteBaseUrl);
    $satFlow = new \TelegramHost\Services\HostSatFlow($api, $cache, $accounts, $conversations, $live, $mainMenu, $siteBaseUrl);
    $adminShell = new \TelegramHost\Services\HostAdminShell($api, $accounts, $conversations, $mainMenu);
    $groupJoinCleaner = new \TelegramHost\Services\GroupJoinMessageCleaner($api);
    $membershipSync = new \TelegramHost\Queue\PendingMembershipSync($pdo);
    $destinationsFlow = new \TelegramHost\Services\HostDestinationsFlow($api, $cache, $accounts, $membershipSync, $siteBaseUrl, $membershipCache);

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
        $accountSync,
        $support,
        $iranSync,
        $adminFast,
        $referenceChannel,
        $satFlow,
        $adminShell,
        $destinationsFlow,
        $cardToCardFlow,
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
        $support,
        $cardToCardFlow,
    );

    $router = new UpdateRouter(
        new DelegationDetector($accounts, $conversations),
        $iranSync,
        $adminFast,
        $accounts,
        $cache,
        $api,
        $messageHandler,
        $callbackHandler,
        $support,
        $mainMenu,
        $conversations,
        $adminShell,
        $groupJoinCleaner,
    );

    (new Bot($router))->handle($update);

    http_response_code(200);
    echo 'ok';

    // Flush response to Telegram before Iran drain / support forward work.
    while (ob_get_level() > 0) {
        ob_end_flush();
    }
    flush();
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    } elseif (function_exists('litespeed_finish_request')) {
        litespeed_finish_request();
    }

    // Account mirror is Iran→host push only — do not pull Iran on every webhook.
    try {
        (new \TelegramHost\Queue\BackgroundSupportForward($supportForward, $support))->drain();
    } catch (\Throwable $e) {
        error_log('[telegram-host] support forward: '.$e->getMessage());
    }

    try {
        $iranRelay->drain();
    } catch (\Throwable $e) {
        error_log('[telegram-host] iran relay: '.$e->getMessage());
    }

    try {
        (new \TelegramHost\Queue\BackgroundTicketSync($ticketSync, $liveClient))->drain();
    } catch (\Throwable $e) {
        error_log('[telegram-host] ticket sync: '.$e->getMessage());
    }

    try {
        (new \TelegramHost\Queue\BackgroundMembershipSync($membershipSync, $liveClient))->drain();
    } catch (\Throwable $e) {
        error_log('[telegram-host] membership sync: '.$e->getMessage());
    }

    try {
        (new \TelegramHost\Queue\BackgroundRegistrationSync($registrationQueue, $sync, $accounts))->drain();
    } catch (\Throwable $e) {
        error_log('[telegram-host] registration sync: '.$e->getMessage());
    }
} catch (\Throwable $e) {
    error_log('[telegram-host] '.$e->getMessage());
    if (! headers_sent()) {
        http_response_code(200);
        echo 'ok';
    }
}
