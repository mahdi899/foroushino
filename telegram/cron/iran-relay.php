<?php

declare(strict_types=1);

// Optional: drain Iran relay queue when webhook volume is low (no user impact).
// */10 * * * * php /path/to/telegram/cron/iran-relay.php >> /path/to/iran-relay.log 2>&1

use TelegramHost\Db\Connection;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\BackgroundIranRelay;
use TelegramHost\Queue\IranUpdateQueue;

$config = require __DIR__.'/../bootstrap.php';

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $relay = new BackgroundIranRelay(new IranUpdateQueue($pdo), new LiveClient($sync), $sync, maxPerRun: 5);
    $relay->drain();
    echo '['.date('c')."] iran-relay ok\n";
} catch (\Throwable $e) {
    fwrite(STDERR, '['.date('c').'] iran-relay failed: '.$e->getMessage()."\n");
    exit(1);
}
