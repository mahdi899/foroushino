<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostAccountSnapshotService;
use App\Support\AesGcmCipher;
use App\Support\HmacSigner;

$bot = TelegramBot::query()->where('key', 'production')->first();
$account = TelegramAccount::query()
    ->where('telegram_bot_id', $bot->id)
    ->whereNotNull('mobile_verified_at')
    ->orderByDesc('updated_at')
    ->first();

$infra = app(App\Services\TelegramInfrastructureService::class);
$payload = app(TelegramHostAccountSnapshotService::class)->accountPayload($account);
$full = array_merge(['action' => 'push_account', 'sent_at' => now()->toIso8601String()], ['account' => $payload]);
$json = json_encode($full, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

$encrypted = AesGcmCipher::encrypt($json, $infra->hostEncryptionKey());
$headers = HmacSigner::headersFor(['body' => $encrypted], $infra->hostSyncSecret());

file_put_contents('/tmp/req_body.txt', $encrypted);
file_put_contents('/tmp/req_headers.txt', implode("\n", array_map(
    fn ($k, $v) => "-H '{$k}: {$v}'",
    array_keys($headers), array_values($headers),
)));

echo "body bytes: " . strlen($encrypted) . "\n";
echo "bearer: " . $infra->hostSyncSecret() . "\n";
foreach ($headers as $k => $v) {
    echo "$k: $v\n";
}
