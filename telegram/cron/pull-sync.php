<?php

declare(strict_types=1);

// Host cron / manual URL: catalog revision pull + per-user account reconcile from Iran.
//
// CLI:  php cron/pull-sync.php [--force]
// Web:  https://<host>/cron/pull-sync.php?token=<webhook_secret>&force=1
//
// Catalog: products/seminars/messages (revision-based).
// Accounts: KYC level, purchases, owned presents — batch account/fetch from Iran.

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountReconcileCoordinator;
use TelegramHost\Cache\CatalogSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Db\Connection;
use TelegramHost\Http\SyncClient;

$config = require __DIR__.'/../bootstrap.php';

$isCli = PHP_SAPI === 'cli';
if (! $isCli) {
    header('Content-Type: text/plain; charset=utf-8');
    $token = (string) ($_GET['token'] ?? '');
    if ($token === '' || ! hash_equals((string) ($config['webhook_secret'] ?? ''), $token)) {
        http_response_code(403);
        echo 'Forbidden';
        exit;
    }
}

$enabled = (bool) ($config['pull_sync_enabled'] ?? false);
if (! $enabled) {
    echo '['.date('c')."] pull-sync disabled — set pull_sync_enabled=true in config.php\n";
    exit(0);
}

$catalogInterval = max(300, (int) ($config['pull_sync_min_interval_seconds'] ?? 3600));
$accountInterval = max(60, (int) ($config['pull_sync_account_interval_seconds'] ?? 300));
$accountBatch = max(5, min(200, (int) ($config['pull_sync_account_batch_size'] ?? 35)));
$accountEnabled = (bool) ($config['pull_sync_account_enabled'] ?? true);

$force = in_array('--force', $argv ?? [], true)
    || (isset($_GET['force']) && (string) $_GET['force'] === '1');

$lockFile = sys_get_temp_dir().'/telegram-pull-sync.lock';
$lock = fopen($lockFile, 'c');
if ($lock === false) {
    echo '['.date('c')."] cannot open lock\n";
    exit(1);
}
if (! flock($lock, LOCK_EX | LOCK_NB)) {
    echo '['.date('c')."] skip: another pull-sync is running\n";
    exit(0);
}

$storageDir = dirname(__DIR__).'/storage';
$catalogStateFile = $storageDir.'/last-pull-sync.txt';
$accountStateFile = $storageDir.'/last-account-reconcile.txt';
$lastCatalog = is_file($catalogStateFile) ? (int) trim((string) file_get_contents($catalogStateFile)) : 0;
$lastAccount = is_file($accountStateFile) ? (int) trim((string) file_get_contents($accountStateFile)) : 0;

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $cache = new SyncCache($pdo, $sync, $config);
    $accounts = new AccountCache($pdo);

    $catalogEmpty = $cache->courses() === [] && $cache->seminars() === [];
    $runCatalog = $force || $catalogEmpty || $lastCatalog === 0 || (time() - $lastCatalog) >= $catalogInterval;
    $runAccounts = $accountEnabled && ($force || $lastAccount === 0 || (time() - $lastAccount) >= $accountInterval);

    if (! $runCatalog && ! $runAccounts) {
        echo '['.date('c')."] skip: catalog interval ({$catalogInterval}s), account interval ({$accountInterval}s)\n";
        exit(0);
    }

    if ($runCatalog) {
        echo '['.date('c')."] catalog reconcile\n";
        (new CatalogSyncCoordinator($cache, $sync))->ensureFresh();
        if ($catalogEmpty) {
            $cache->refreshAll();
        }
        @file_put_contents($catalogStateFile, (string) time());
        echo '['.date('c')."] catalog ok\n";
    }

    if ($runAccounts) {
        echo '['.date('c')."] account reconcile (batch {$accountBatch})\n";
        $result = (new AccountReconcileCoordinator($accounts, $sync))->reconcileBatch($accountBatch);
        @file_put_contents($accountStateFile, (string) time());
        echo '['.date('c')."] accounts candidates={$result['candidates']} refreshed={$result['refreshed']} failed={$result['failed']}\n";
    }

    echo '['.date('c')."] pull-sync ok\n";
} catch (\Throwable $e) {
    echo '['.date('c').'] pull-sync failed: '.$e->getMessage()."\n";
    exit(1);
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}
