<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostPushService;

$bot = TelegramBot::query()->where('key', 'production')->first();
$account = TelegramAccount::query()
    ->where('telegram_bot_id', $bot->id)
    ->whereNotNull('mobile_verified_at')
    ->orderByDesc('updated_at')
    ->first();

if (! $account) {
    echo "no verified account found\n";
    exit(0);
}

$payload = app(TelegramHostAccountSnapshotService::class)->accountPayload($account);
$start = microtime(true);
$ok = app(TelegramHostPushService::class)->pushAccount($payload);
$ms = round((microtime(true) - $start) * 1000);
echo "telegram_user_id={$account->telegram_user_id} ok=" . ($ok ? 'true' : 'false') . " time={$ms}ms\n";
