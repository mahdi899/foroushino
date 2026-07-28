<?php

declare(strict_types=1);

/**
 * Refresh telegram/config.php bot_token (+ secrets) from Laravel panel.
 * Does not print secrets.
 *
 *   php _local_refresh_token.php
 */

require __DIR__.'/../bahram-cm/backend/vendor/autoload.php';
$app = require __DIR__.'/../bahram-cm/backend/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramInfrastructureService;

$infra = app(TelegramInfrastructureService::class);
$bot = TelegramBot::query()->where('key', 'production')->first();
$token = (string) ($bot?->resolveToken() ?? '');
$webhook = (string) ($infra->webhookSecret() ?? '');
$hostSecret = (string) ($infra->hostSyncSecret() ?? '');

if ($token === '') {
    fwrite(STDERR, "Panel production bot has no token.\n");
    exit(1);
}

$configPath = __DIR__.'/config.php';
if (! is_file($configPath)) {
    fwrite(STDERR, "config.php missing — run _local_enable_host.php first\n");
    exit(1);
}

/** @var array<string, mixed> $config */
$config = require $configPath;

$changed = [];
if ($token !== (string) ($config['bot_token'] ?? '')) {
    $config['bot_token'] = $token;
    $changed[] = 'bot_token';
}
if ($webhook !== '' && $webhook !== (string) ($config['webhook_secret'] ?? '')) {
    $config['webhook_secret'] = $webhook;
    $changed[] = 'webhook_secret';
}
if ($hostSecret !== '' && $hostSecret !== (string) ($config['host_sync_token'] ?? '')) {
    $config['host_sync_token'] = $hostSecret;
    $changed[] = 'host_sync_token';
}

$apiBase = rtrim((string) config('telegram_bot.api_base_url', env('TELEGRAM_API_BASE_URL', '')), '/');
$apiBearer = (string) env('PROXY_SHARED_TOKEN', '');
if ($apiBase !== '' && (string) ($config['telegram_api_base_url'] ?? '') !== $apiBase) {
    $config['telegram_api_base_url'] = $apiBase;
    $changed[] = 'telegram_api_base_url';
}
if ($apiBearer !== '' && (string) ($config['telegram_api_bearer'] ?? '') !== $apiBearer) {
    $config['telegram_api_bearer'] = $apiBearer;
    $changed[] = 'telegram_api_bearer';
}

if ($changed !== []) {
    $export = var_export($config, true);
    file_put_contents(
        $configPath,
        "<?php\n\ndeclare(strict_types=1);\n\n/** Local host config — refreshed from panel. */\nreturn {$export};\n",
    );
    echo 'Updated: '.implode(', ', $changed)."\n";
} else {
    echo "config.php already matches panel.\n";
}

// Verify token via Bot API proxy (getMe) without printing credentials.
$base = rtrim((string) ($config['telegram_api_base_url'] ?? 'https://api.telegram.org'), '/');
$url = $base.'/bot'.$token.'/getMe';
$headers = ['Content-Type: application/json'];
$bearer = trim((string) ($config['telegram_api_bearer'] ?? ''));
if ($bearer !== '') {
    $headers[] = 'Authorization: Bearer '.$bearer;
}

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => '{}',
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
]);
$raw = curl_exec($ch);
$code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

$decoded = is_string($raw) ? json_decode($raw, true) : null;
if (is_array($decoded) && ($decoded['ok'] ?? false) === true) {
    $username = (string) ($decoded['result']['username'] ?? '');
    echo $username !== '' ? "getMe=OK @{$username}\n" : "getMe=OK\n";
    exit(0);
}

fwrite(STDERR, "getMe failed HTTP {$code}".($err !== '' ? " ({$err})" : '')."\n");
if (is_string($raw) && $raw !== '') {
    fwrite(STDERR, 'body='.substr($raw, 0, 200)."\n");
}
exit(1);
