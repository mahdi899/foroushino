<?php

declare(strict_types=1);

/**
 * Local substitute for a public Telegram webhook.
 *
 *   php scripts/telegram-local/local-poll.php
 *   php scripts/telegram-local/local-poll.php --once
 */

use TelegramHost\Telegram\BotApiClient;

$telegramRoot = require __DIR__.'/_paths.php';
$config = require $telegramRoot.'/bootstrap.php';

$once = in_array('--once', $argv, true);
$webhookBase = 'http://127.0.0.1:8088';
foreach ($argv as $arg) {
    if (str_starts_with($arg, '--webhook-base=')) {
        $webhookBase = rtrim(substr($arg, strlen('--webhook-base=')), '/');
    }
}

$webhookUrl = $webhookBase.'/public/webhook.php';
$secret = (string) ($config['webhook_secret'] ?? '');
$token = trim((string) ($config['bot_token'] ?? ''));

if ($token === '' || $secret === '') {
    fwrite(STDERR, "bot_token / webhook_secret missing in telegram/config.php\n");
    exit(1);
}

$lockPath = $telegramRoot.'/storage/local-poll.lock';
if (! is_dir(dirname($lockPath))) {
    mkdir(dirname($lockPath), 0775, true);
}
$lockFp = fopen($lockPath, 'c+');
if ($lockFp === false) {
    fwrite(STDERR, "Cannot open lock file: {$lockPath}\n");
    exit(1);
}
if (! flock($lockFp, LOCK_EX | LOCK_NB)) {
    fwrite(STDERR, "Another local-poll is already running (lock: {$lockPath}). Stop it first.\n");
    exit(1);
}
ftruncate($lockFp, 0);
fwrite($lockFp, (string) getmypid());

register_shutdown_function(static function () use ($lockFp): void {
    flock($lockFp, LOCK_UN);
    fclose($lockFp);
});

$api = new BotApiClient($token);

fwrite(STDOUT, "Deleting Telegram webhook so getUpdates can run…\n");
fwrite(STDOUT, "Tip: set TELEGRAM_LOCAL_POLL_BOT_TOKEN in backend/.env + run php scripts/telegram-local/refresh-token.php\n");
try {
    $api->deleteWebhook(false);
} catch (Throwable $e) {
    fwrite(STDERR, 'deleteWebhook failed: '.$e->getMessage()."\n");
    exit(1);
}

fwrite(STDOUT, "Local poll → {$webhookUrl}\nCtrl+C to stop.\n");

$offset = 0;
$webhookClears = 0;
while (true) {
    try {
        $updates = $api->getUpdates($offset, 25);
    } catch (Throwable $e) {
        $msg = $e->getMessage();
        fwrite(STDERR, '['.date('H:i:s').'] getUpdates: '.$msg."\n");

        if (
            str_contains($msg, 'webhook is active')
            || str_contains($msg, 'terminated by setWebhook')
        ) {
            try {
                $api->deleteWebhook(false);
                $webhookClears++;
                fwrite(STDOUT, '['.date('H:i:s')."] deleteWebhook (heal #{$webhookClears})\n");
            } catch (Throwable $delErr) {
                fwrite(STDERR, '['.date('H:i:s').'] deleteWebhook heal failed: '.$delErr->getMessage()."\n");
                sleep(2);
            }
            if ($once) {
                exit(1);
            }
            continue;
        }

        if (str_contains($msg, 'other getUpdates request')) {
            fwrite(STDERR, '['.date('H:i:s')."] only one poll allowed — stop duplicate local-poll or telegram:poll\n");
            sleep(5);
            if ($once) {
                exit(1);
            }
            continue;
        }

        if (str_contains($msg, 'Conflict:')) {
            sleep(2);
            if ($once) {
                exit(1);
            }
            continue;
        }

        sleep(2);
        if ($once) {
            exit(1);
        }
        continue;
    }

    if ($updates === []) {
        if ($once) {
            fwrite(STDOUT, "No updates.\n");
            exit(0);
        }
        continue;
    }

    foreach ($updates as $update) {
        $updateId = (int) ($update['update_id'] ?? 0);
        if ($updateId > 0) {
            $offset = $updateId + 1;
        }

        $ch = curl_init($webhookUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($update, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-Telegram-Bot-Api-Secret-Token: '.$secret,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 90,
        ]);
        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0) {
            fwrite(STDERR, "update #{$updateId} POST failed (curl {$errno})\n");
            continue;
        }

        fwrite(STDOUT, "update #{$updateId} → HTTP {$status} ".trim((string) $body)."\n");
    }

    if ($once) {
        exit(0);
    }
}
