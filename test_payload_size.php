<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostAccountSnapshotService;
use App\Support\AesGcmCipher;

$bot = TelegramBot::query()->where('key', 'production')->first();
$account = TelegramAccount::query()
    ->where('telegram_bot_id', $bot->id)
    ->whereNotNull('mobile_verified_at')
    ->orderByDesc('updated_at')
    ->first();

$payload = app(TelegramHostAccountSnapshotService::class)->accountPayload($account);
$json = json_encode(['action' => 'push_account', 'account' => $payload], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
echo "json bytes: " . strlen($json) . "\n";

$infra = app(App\Services\TelegramInfrastructureService::class);
$encrypted = AesGcmCipher::encrypt($json, $infra->hostEncryptionKey());
echo "encrypted (base64) bytes: " . strlen($encrypted) . "\n";
