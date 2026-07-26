<?php

declare(strict_types=1);

// Optional safety net — default OFF (see config `pull_sync_enabled`).
// Normal updates: Iran server pushes to public/host-sync.php when data changes.
//
// If you must keep a cron, use at most once per day, e.g.:
//   0 4 * * * /usr/local/bin/ea-php83 /path/to/telegram/cron/pull-sync.php >> /path/to/cron.log 2>&1

use TelegramHost\Cache\CatalogSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Http\SyncClient;

$config = require __DIR__.'/../bootstrap.php';

$enabled = (bool) ($config['pull_sync_enabled'] ?? false);
if (! $enabled) {
    echo '['.date('c')."] pull-sync disabled — use Iran server push to host-sync.php\n";
    exit(0);
}

$minInterval = max(300, (int) ($config['pull_sync_min_interval_seconds'] ?? 3600));

$lockFile = sys_get_temp_dir().'/telegram-pull-sync.lock';
$lock = fopen($lockFile, 'c');
if ($lock === false) {
    fwrite(STDERR, '['.date('c')."] cannot open lock\n");
    exit(1);
}
if (! flock($lock, LOCK_EX | LOCK_NB)) {
    echo '['.date('c')."] skip: another pull-sync is running\n";
    exit(0);
}

$stateFile = dirname(__DIR__).'/storage/last-pull-sync.txt';
$lastRun = is_file($stateFile) ? (int) trim((string) file_get_contents($stateFile)) : 0;
$force = in_array('--force', $argv ?? [], true);

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $cache = new SyncCache($pdo, $sync, $config);

    $catalogEmpty = $cache->courses() === [] && $cache->seminars() === [];

    if (! $force && ! $catalogEmpty && $lastRun > 0 && (time() - $lastRun) < $minInterval) {
        echo '['.date('c')."] skip: interval ({$minInterval}s)\n";
        exit(0);
    }

    $coordinator = new CatalogSyncCoordinator($cache, $sync);
    $coordinator->ensureFresh();

    if ($catalogEmpty) {
        $cache->refreshAll();
    }

    @file_put_contents($stateFile, (string) time());
    echo '['.date('c')."] pull-sync ok\n";
} catch (\Throwable $e) {
    fwrite(STDERR, '['.date('c').'] pull-sync failed: '.$e->getMessage()."\n");
    exit(1);
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}
