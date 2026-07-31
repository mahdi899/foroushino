<?php

declare(strict_types=1);

/**
 * One-off diagnostic page — checks every layer the bot depends on and prints
 * a plain-language report. Protected by the webhook secret so randoms can't
 * hit it. Delete this file once the bot is confirmed working.
 *
 * Usage: https://<host_public_url>/diagnose.php?token=<webhook_secret>
 */

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\HybridAccountCache;
use TelegramHost\Cache\HotCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\BackgroundDrainCoordinator;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Queue\PendingCheckoutRevoke;
use TelegramHost\Queue\PendingMembershipSync;
use TelegramHost\Queue\PendingRegistrationSync;
use TelegramHost\Queue\PendingAccountRefresh;
use TelegramHost\Queue\PendingSupportForward;
use TelegramHost\Queue\PendingTicketSync;
use TelegramHost\Services\HostSupportService;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Services\MainMenu;
use TelegramHost\Telegram\BotApiClient;

$config = require __DIR__.'/../bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');

$token = (string) ($_GET['token'] ?? '');
if (! hash_equals((string) $config['webhook_secret'], $token)) {
    http_response_code(403);
    echo "Forbidden.\nUsage: diagnose.php?token=<webhook_secret from config.php>\n";
    exit;
}

if (isset($_GET['reset_circuit'])) {
    $breaker = new \TelegramHost\Support\IranCircuitBreaker();
    $breaker->reset();
    echo "Iran circuit breaker reset OK.\n";
    echo "Done.\n";
    exit;
}

function step(string $title, callable $fn): void
{
    echo "== {$title} ==\n";
    try {
        $fn();
    } catch (\Throwable $e) {
        echo 'FAIL: '.$e::class.': '.$e->getMessage()."\n";
    }
    echo "\n";
}

echo "Telegram host diagnostic — ".date('Y-m-d H:i:s')."\n\n";

step('PHP / extensions', function () {
    echo 'PHP version: '.PHP_VERSION."\n";
    foreach (['pdo_mysql', 'curl', 'openssl', 'mbstring', 'json', 'redis'] as $ext) {
        echo $ext.': '.(extension_loaded($ext) ? 'OK' : 'MISSING')."\n";
    }
});

step('Config sanity', function () use ($config) {
    $required = ['bot_token', 'webhook_secret', 'sync_base_url', 'host_public_url', 'db'];
    foreach ($required as $key) {
        $present = array_key_exists($key, $config) && $config[$key] !== '' && $config[$key] !== null;
        echo $key.': '.($present ? 'present' : 'MISSING/EMPTY')."\n";
    }
    $syncToken = \TelegramHost\Support\HostBridgeConfig::syncToken($config);
    echo 'host_sync_token: '.($syncToken !== '' ? 'present ('.strlen($syncToken).' chars)' : 'MISSING/EMPTY')."\n";
    $relay = (int) ($config['iran_relay_per_webhook'] ?? 2);
    echo 'iran_relay_per_webhook: '.$relay."\n";
    echo 'webhook_drain_per_queue: '.(int) ($config['webhook_drain_per_queue'] ?? 1)."\n";
    echo 'cron_drain_budget_seconds: '.(float) ($config['cron_drain_budget_seconds'] ?? 50)."\n";
});

step('Redis / HotCache', function () use ($config) {
    $hot = new HotCache($config);
    echo 'redis.enabled: '.((($config['redis']['enabled'] ?? false) ? 'yes' : 'no'))."\n";
    echo 'hot_cache_active: '.($hot->isActive() ? 'yes' : 'no')."\n";
});

step('Iran circuit breaker', function () {
    $status = (new \TelegramHost\Support\IranCircuitBreaker())->status();
    echo 'open: '.($status['open'] ? 'YES (Iran calls fail-fast)' : 'no')."\n";
    echo 'consecutive_failures: '.$status['consecutive_failures']."\n";
    echo 'last_failure_at: '.($status['last_failure_at'] > 0 ? date('c', $status['last_failure_at']) : 'never')."\n";
    echo 'file: '.$status['file']."\n";
    echo "Reset: diagnose.php?token=...&reset_circuit=1\n";
});

step('MySQL connection', function () use ($config) {
    $pdo = Connection::get($config);
    echo "Connected OK.\n";
    $tables = ['telegram_accounts_cache', 'conversations', 'bot_feature_flags', 'required_chats', 'catalog_products', 'catalog_seminars', 'sync_meta', 'bot_messages', 'membership_cache'];
    $existing = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        echo $t.': '.(in_array($t, $existing, true) ? 'exists' : 'MISSING — run db/schema.sql')."\n";
    }
});

step('Background queue depths', function () use ($config) {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $liveClient = new LiveClient($sync);
    $cache = new SyncCache($pdo, $sync, $config);
    $accounts = new AccountCache($pdo);
    $api = new BotApiClient((string) $config['bot_token']);
    $conversations = new ConversationRepository($pdo);
    $ticketSync = new PendingTicketSync($pdo);
    $supportForward = new PendingSupportForward($pdo);
    $support = new HostSupportService($api, $cache, $conversations, $accounts, new MainMenu($cache, $accounts), $pdo, $ticketSync, $supportForward);

    $checkoutRevokeQueue = new PendingCheckoutRevoke($pdo);
    $accountRefreshQueue = new PendingAccountRefresh($pdo);
    $hybridCache = new HybridAccountCache($accounts, $accountRefreshQueue, $config);

    $depths = (new BackgroundDrainCoordinator(
        new PendingRegistrationSync($pdo),
        $supportForward,
        new IranUpdateQueue($pdo),
        $ticketSync,
        new PendingMembershipSync($pdo),
        $sync,
        $liveClient,
        $accounts,
        $support,
        max(1, (int) ($config['iran_relay_per_webhook'] ?? 4)),
        $accountRefreshQueue,
        $hybridCache,
        $checkoutRevokeQueue,
    ))->queueDepths();

    foreach ($depths as $table => $count) {
        echo $table.': '.$count."\n";
    }
});

step('Sync API latency (account/fetch probe)', function () use ($config) {
    echo 'sync_base_url: '.$config['sync_base_url']."\n";
    $sync = new SyncClient($config);
    $started = microtime(true);
    $result = $sync->call('account/fetch', ['telegram_user_id' => 1]);
    $ms = (int) round((microtime(true) - $started) * 1000);
    echo "Round-trip: {$ms} ms\n";
    echo 'ok: '.json_encode($result['ok'] ?? null)."\n";
});

step('Telegram Bot API (getMe)', function () use ($config) {
    $ch = curl_init("https://api.telegram.org/bot{$config['bot_token']}/getMe");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $started = microtime(true);
    $raw = curl_exec($ch);
    $ms = (int) round((microtime(true) - $started) * 1000);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        echo "cURL error reaching api.telegram.org: {$err}\n";

        return;
    }
    echo "Round-trip: {$ms} ms\n";
    echo "Response: {$raw}\n";
});

echo "Done. Delete this file (diagnose.php) once finished.\n";
