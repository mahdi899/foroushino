import sys
from pathlib import Path

from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

php = f"""
require '{BE}/vendor/autoload.php';
$app = require '{BE}/bootstrap/app.php';
$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
$factory = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class);
$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::query()->where('key', 'production')->first();
if (!$bot) {{ echo 'NO_BOT'.PHP_EOL; exit(1); }}
$client = $factory->forBot($bot);
$info = $client->getWebhookInfo();
echo 'webhook_url='.($info['url'] ?? '').PHP_EOL;
echo 'allowed_updates='.json_encode($info['allowed_updates'] ?? null, JSON_UNESCAPED_UNICODE).PHP_EOL;
echo 'pending_update_count='.($info['pending_update_count'] ?? '?').PHP_EOL;
echo 'last_error_message='.($info['last_error_message'] ?? '').PHP_EOL;
echo 'last_error_date='.($info['last_error_date'] ?? '').PHP_EOL;
echo 'has_custom_certificate='.json_encode($info['has_custom_certificate'] ?? null).PHP_EOL;
echo 'db_webhook_secret_len='.strlen((string)($bot->webhook_secret ?? '')).PHP_EOL;
echo 'panel_webhook_secret_len='.strlen((string)($infra->webhookSecret() ?? '')).PHP_EOL;
echo 'uses_worker='.($infra->usesWorkerBridge() ? 'yes' : 'no').PHP_EOL;
echo 'api_base='.$infra->telegramApiBaseUrl().PHP_EOL;
$pending = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->where('status','pending')->count();
$failed = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->where('status','failed')->count();
$cbFailed = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->where('status','failed')->where('update_type','callback_query')->count();
echo \"updates_pending=$pending failed=$failed callback_failed=$cbFailed\".PHP_EOL;
"""

cmds = [
    f"cd {BE} && php -r '{php}'",
    "redis-cli LLEN queues:telegram-inbound 2>/dev/null || echo 'no redis'",
    "redis-cli LLEN queues:telegram-replies 2>/dev/null || true",
    "supervisorctl status bahram-horizon 2>/dev/null | head -5",
    f"tail -30 {BE}/storage/logs/telegram.log 2>/dev/null | tail -15",
]

c = connect(env)
for cmd in cmds:
    print("===", cmd[:100].replace("\n", " "), "===")
    _, out, err = c.exec_command(cmd, timeout=90)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR:", e[:800])
c.close()
