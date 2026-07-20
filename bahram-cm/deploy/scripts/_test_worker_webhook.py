"""Test worker webhook end-to-end for menu button."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

php = r"""
require 'vendor/autoload.php';
$app = require 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$secret = trim((string) (app(App\Services\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
$uid = 888877940 + random_int(1, 9999);
$payload = json_encode([
    'update_id' => $uid,
    'message' => [
        'message_id' => 1,
        'from' => ['id' => 97343715],
        'chat' => ['id' => 97343715, 'type' => 'private'],
        'date' => time(),
        'text' => 'حساب کاربری 👤',
    ],
]);
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-Telegram-Bot-Api-Secret-Token: '.$secret,
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
echo "http={$code} body={$body}\n";
$row = App\Modules\TelegramBot\Models\TelegramUpdate::where('telegram_update_id', $uid)->first();
echo 'db_status='.($row ? $row->status->value : 'missing')."\n";
"""

cmds = f"cd {BE} && php -r {repr(php)}"
# repr won't work well - upload file instead
from _deploy_common import ROOT, upload_files
local = ROOT / "backend/storage/app/_test_worker_webhook.php"
local.write_text("<?php\n"+php, encoding="utf-8")
c = connect(env, timeout=60)
upload_files(c, [(local, "backend/storage/app/_test_worker_webhook.php")], env)
_, out, _ = c.exec_command(f"cd {BE} && php storage/app/_test_worker_webhook.php && rm -f storage/app/_test_worker_webhook.php", timeout=60)
print(out.read().decode("utf-8", "replace"))
c.close()
