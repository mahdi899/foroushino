<?php

declare(strict_types=1);

/**
 * One-off diagnostic page — checks every layer the bot depends on and prints
 * a plain-language report. Protected by the webhook secret so randoms can't
 * hit it. Delete this file once the bot is confirmed working.
 *
 * Usage: https://<host_public_url>/diagnose.php?token=<webhook_secret>
 */

use TelegramHost\Db\Connection;
use TelegramHost\Http\SyncClient;

$config = require __DIR__.'/../bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');

$token = (string) ($_GET['token'] ?? '');
if (! hash_equals((string) $config['webhook_secret'], $token)) {
    http_response_code(403);
    echo "Forbidden.\nUsage: diagnose.php?token=<webhook_secret from config.php>\n";
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
    foreach (['pdo_mysql', 'curl', 'openssl', 'mbstring', 'json'] as $ext) {
        echo $ext.': '.(extension_loaded($ext) ? 'OK' : 'MISSING')."\n";
    }
});

step('Config sanity', function () use ($config) {
    $required = ['bot_token', 'webhook_secret', 'hmac_secret', 'aes_key', 'sync_base_url', 'host_public_url', 'db'];
    foreach ($required as $key) {
        $present = array_key_exists($key, $config) && $config[$key] !== '' && $config[$key] !== null;
        echo $key.': '.($present ? 'present' : 'MISSING/EMPTY')."\n";
    }
    $key = base64_decode((string) $config['aes_key'], true);
    echo 'aes_key decodes to '.($key === false ? 'INVALID base64' : strlen($key).' bytes (expected 32)')."\n";
});

step('MySQL connection', function () use ($config) {
    $pdo = Connection::get($config);
    echo "Connected OK.\n";
    $tables = ['telegram_accounts_cache', 'conversations', 'bot_feature_flags', 'required_chats', 'catalog_products', 'catalog_seminars', 'sync_meta', 'bot_messages'];
    $existing = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);
    foreach ($tables as $t) {
        echo $t.': '.(in_array($t, $existing, true) ? 'exists' : 'MISSING — run db/schema.sql')."\n";
    }
});

step('Telegram Bot API (getMe)', function () use ($config) {
    $ch = curl_init("https://api.telegram.org/bot{$config['bot_token']}/getMe");
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);
    if ($raw === false) {
        echo "cURL error reaching api.telegram.org: {$err}\n";

        return;
    }
    echo "Response: {$raw}\n";
});

step('Sync API reachability (main Iran server)', function () use ($config) {
    echo 'sync_base_url: '.$config['sync_base_url']."\n";
    $sync = new SyncClient($config);
    $result = $sync->call('account/fetch', ['telegram_user_id' => 1]);
    echo "Reached server OK. Decoded response:\n";
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)."\n";
});

echo "Done. Delete this file (diagnose.php) once finished.\n";
