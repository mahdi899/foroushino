#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Minute cron — drains background queues without blocking webhook workers.
 *
 * cPanel: * * * * * /usr/local/bin/php /home/USER/telegram/cron/drain.php >> /home/USER/telegram/storage/cron-drain.log 2>&1
 */

$config = require dirname(__DIR__).'/bootstrap.php';

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\HybridAccountCache;
use TelegramHost\Cache\HotCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Db\Connection;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\BackgroundDrainCoordinator;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Queue\PendingAccountRefresh;
use TelegramHost\Queue\PendingCheckoutRevoke;
use TelegramHost\Queue\PendingMembershipSync;
use TelegramHost\Queue\PendingRegistrationSync;
use TelegramHost\Queue\PendingSupportForward;
use TelegramHost\Queue\PendingTicketSync;
use TelegramHost\Services\HostSupportService;
use TelegramHost\Telegram\BotApiClient;

$lockPath = dirname(__DIR__).'/storage/drain.lock';
$lockFp = fopen($lockPath, 'c+');
if ($lockFp === false || ! flock($lockFp, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, '['.date('c')."] drain skipped — another run is active\n");
    exit(0);
}

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $liveClient = new LiveClient($sync);
    $cache = new SyncCache($pdo, $sync, $config);
    $accounts = new AccountCache($pdo);
    $api = new BotApiClient((string) $config['bot_token']);
    $conversations = new ConversationRepository($pdo);
    $ticketSync = new PendingTicketSync($pdo);
    $supportForward = new PendingSupportForward($pdo);
    $support = new HostSupportService($api, $cache, $conversations, $accounts, new \TelegramHost\Services\MainMenu($cache, $accounts), $pdo, $ticketSync, $supportForward);

    $accountRefreshQueue = new PendingAccountRefresh($pdo);
    $hybridCache = new HybridAccountCache($accounts, $accountRefreshQueue, $config);

    $coordinator = new BackgroundDrainCoordinator(
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
        new PendingCheckoutRevoke($pdo),
    );

    $budget = (float) ($config['cron_drain_budget_seconds'] ?? 50);
    $perRound = max(1, (int) ($config['cron_drain_per_queue'] ?? 5));
    $processed = $coordinator->drainWithBudget($perRound, $budget);

    echo '['.date('c')."] drain ok — processed={$processed}\n";
} catch (Throwable $e) {
    fwrite(STDERR, '['.date('c').'] drain failed: '.$e->getMessage()."\n");
    exit(1);
} finally {
    flock($lockFp, LOCK_UN);
    fclose($lockFp);
}
