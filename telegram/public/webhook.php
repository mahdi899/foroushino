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
use TelegramHost\Queue\BackgroundDrainCoordinator;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Routing\DelegationDetector;
use TelegramHost\Routing\UpdateRouter;
use TelegramHost\Security\RateLimiter;
use TelegramHost\Services\HostRegistrationFlow;
use TelegramHost\Services\MainMenu;
use TelegramHost\Services\MembershipCheckCache;
use TelegramHost\Services\MembershipGate;
use TelegramHost\Services\PurchaseFlow;
use TelegramHost\Services\ReferenceChannelFlow;
use TelegramHost\Telegram\BotApiClient;

$config = require __DIR__.'/../bootstrap.php';

// Bootstrap expanded hot-patch endpoint when the server still has a legacy allowlist.
$patchTarget = __DIR__.'/apply-host-patch.php';
if (! is_file($patchTarget) || ! str_contains((string) file_get_contents($patchTarget), "'config.php'")) {
    $patchPhp = <<<'PATCH'
<?php

declare(strict_types=1);

/** Remote hot-patch endpoint — Bearer host_sync_secret required. */
$secret = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
if (! preg_match('/^Bearer\s+(\S+)$/i', $secret, $m)) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'unauthorized']);
    exit;
}

$config = require dirname(__DIR__).'/config.php';
$expected = (string) ($config['host_sync_token'] ?? '');
if ($expected === '' || ! hash_equals($expected, $m[1])) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode((string) $raw, true);
if (! is_array($payload) || ! is_array($payload['files'] ?? null)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'invalid_payload']);
    exit;
}

$allowed = [
    'public/webhook.php',
    'public/apply-host-patch.php',
    'config.php',
    'src/Services/HostRegistrationFlow.php',
    'src/Cache/SyncCache.php',
    'src/Cache/HotCache.php',
    'src/Queue/PendingRegistrationSync.php',
    'src/Queue/BackgroundRegistrationSync.php',
    'cron/pull-sync.php',
];

$root = dirname(__DIR__);
$written = [];
foreach ($payload['files'] as $rel => $b64) {
    if (! is_string($rel) || ! in_array($rel, $allowed, true)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'path_not_allowed', 'path' => $rel]);
        exit;
    }
    $bytes = base64_decode((string) $b64, true);
    if ($bytes === false) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_base64', 'path' => $rel]);
        exit;
    }
    $target = $root.'/'.$rel;
    $dir = dirname($target);
    if (! is_dir($dir) && ! mkdir($dir, 0755, true) && ! is_dir($dir)) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'mkdir_failed', 'path' => $rel]);
        exit;
    }
    if (file_put_contents($target, $bytes) === false) {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'write_failed', 'path' => $rel]);
        exit;
    }
    $written[] = $rel;
}

header('Content-Type: application/json');
echo json_encode(['ok' => true, 'written' => $written]);
PATCH;
    @file_put_contents($patchTarget, $patchPhp);
}

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
            http_response_code(200);
            echo 'ok';
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
    $siteBaseUrl = rtrim((string) ($config['site_base_url'] ?? 'https://rostami.app'), '/');

    $accountSync = new AccountSyncCoordinator($accounts, $sync);
    $ownership = new \TelegramHost\Account\OwnershipResolver($accounts);
    $hotCache = new \TelegramHost\Cache\HotCache($config);
    $membershipCheckCache = new MembershipCheckCache($pdo, $hotCache);

    $mainMenu = new MainMenu($cache, $accounts);
    $pendingMobileAccess = new PendingMobileAccess($pdo);
    $registrationQueue = new \TelegramHost\Queue\PendingRegistrationSync($pdo);
    $checkoutRevokeQueue = new \TelegramHost\Queue\PendingCheckoutRevoke($pdo);
    $membership = new MembershipGate($cache, $api, $membershipCheckCache);
    $registration = new HostRegistrationFlow($sync, $api, $accounts, $conversations, $mainMenu, $cache, $registrationQueue, $membership, $pendingMobileAccess, $accountSync);
    $discountPreview = new \TelegramHost\Services\HostDiscountPreview($cache);
    $cardToCardFlow = new \TelegramHost\Services\HostCardToCardFlow($api, $cache, $live, $conversations, $accounts, $mainMenu);
    $purchaseFlow = new PurchaseFlow($api, $live, $cache, $conversations, $mainMenu, $discountPreview, $cardToCardFlow, $accounts, $accountSync, $checkoutRevokeQueue);
    $ticketSync = new \TelegramHost\Queue\PendingTicketSync($pdo);
    $supportForward = new \TelegramHost\Queue\PendingSupportForward($pdo);
    $support = new \TelegramHost\Services\HostSupportService($api, $cache, $conversations, $accounts, $mainMenu, $pdo, $ticketSync, $supportForward);
    $subscriberEligibility = new \TelegramHost\Services\SubscriberEligibility($accounts, $cache);
    $catalogPhotos = new \TelegramHost\Catalog\CatalogPhotoMessenger(
        $api,
        new \TelegramHost\Catalog\CatalogPhotoCache($pdo),
    );
    $referenceChannel = new ReferenceChannelFlow($api, $cache, $accounts, $accountSync, $ownership, $catalogPhotos, $siteBaseUrl);
    $satFlow = new \TelegramHost\Services\HostSatFlow($api, $cache, $accounts, $conversations, $live, $mainMenu, $siteBaseUrl);
    $adminShell = new \TelegramHost\Services\HostAdminShell($api, $accounts, $conversations, $mainMenu);
    $groupJoinCleaner = new \TelegramHost\Services\GroupJoinMessageCleaner($api);
    $membershipSync = new \TelegramHost\Queue\PendingMembershipSync($pdo);
    $destinationsFlow = new \TelegramHost\Services\HostDestinationsFlow($api, $cache, $accounts, $membershipSync, $siteBaseUrl, $liveClient, $membershipCheckCache);

    $accountRefreshQueue = new \TelegramHost\Queue\PendingAccountRefresh($pdo);
    $hybridCache = new \TelegramHost\Account\HybridAccountCache($accounts, $accountRefreshQueue, $config);

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
        $subscriberEligibility,
        $ownership,
        $hybridCache,
        $siteBaseUrl,
        $checkoutRevokeQueue,
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
        $subscriberEligibility,
        $ownership,
        $catalogPhotos,
    );

    $joinRequests = new \TelegramHost\Services\HostChatJoinRequestHandler(
        $api,
        $cache,
        $accounts,
        $siteBaseUrl,
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
        $membership,
        $joinRequests,
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
    $drainPerQueue = max(8, (int) ($config['webhook_drain_per_queue'] ?? 1));
    if ($drainPerQueue > 0) {
        try {
            (new BackgroundDrainCoordinator(
                $registrationQueue,
                $supportForward,
                $iranQueue,
                $ticketSync,
                $membershipSync,
                $sync,
                $liveClient,
                $accounts,
                $support,
                $maxRelay,
                $accountRefreshQueue,
                $hybridCache,
                $checkoutRevokeQueue,
            ))->drainOnce($drainPerQueue);

            if ($registrationQueue->countPending() > 0) {
                (new \TelegramHost\Queue\BackgroundRegistrationSync(
                    $registrationQueue,
                    $sync,
                    $accounts,
                    max(5, $drainPerQueue),
                ))->drain();
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] post-webhook drain: '.$e->getMessage());
        }
    }
} catch (\Throwable $e) {
    error_log('[telegram-host] '.$e->getMessage());
    if (! headers_sent()) {
        http_response_code(200);
        echo 'ok';
    }
}
