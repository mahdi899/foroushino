#!/usr/bin/env php
<?php

declare(strict_types=1);

// Optional manual drain — NOT for cPanel cron. Iran relay runs from webhook.php
// (iran_relay_per_webhook). Data sync is push-only from Iran (host-sync.php).

$config = require dirname(__DIR__).'/bootstrap.php';

use TelegramHost\Db\Connection;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Queue\BackgroundIranRelay;
use TelegramHost\Queue\IranUpdateQueue;

try {
    $pdo = Connection::get($config);
    $sync = new SyncClient($config);
    $relay = new BackgroundIranRelay(new IranUpdateQueue($pdo), new LiveClient($sync), $sync, maxPerRun: 20);
    $relay->drain();
    echo '['.date('c')."] iran-relay ok\n";
} catch (Throwable $e) {
    fwrite(STDERR, '['.date('c').'] iran-relay failed: '.$e->getMessage()."\n");
    exit(1);
}
