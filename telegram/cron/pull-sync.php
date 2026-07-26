<?php

declare(strict_types=1);

// Run every 2 minutes via cPanel Cron Jobs:
//   */2 * * * * php /home/USER/telegram/cron/pull-sync.php >> /home/USER/telegram/cron.log 2>&1
//
// Webhook never pulls from Iran — only this cron updates local MySQL.

use TelegramHost\Cache\CatalogSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Http\SyncClient;

$config = require __DIR__.'/../bootstrap.php';

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $cache = new SyncCache($pdo, $sync, $config);
    $coordinator = new CatalogSyncCoordinator($cache, $sync);
    $coordinator->ensureFresh();

    if ($cache->courses() === [] && $cache->seminars() === []) {
        $cache->refreshAll();
    }

    echo '['.date('c')."] sync ok\n";
} catch (\Throwable $e) {
    fwrite(STDERR, '['.date('c').'] sync failed: '.$e->getMessage()."\n");
    exit(1);
}
