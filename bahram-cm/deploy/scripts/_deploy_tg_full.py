"""Full Telegram bot fix deploy + server setup (webhook, reconcile, cron, horizon)."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Models/TelegramBot.php",
    "backend/app/Modules/TelegramBot/Http/Middleware/VerifyTelegramWebhookSecret.php",
    "backend/app/Modules/TelegramBot/Console/TelegramWebhookSetCommand.php",
    "backend/app/Modules/TelegramBot/Console/TelegramWebhookReconcileCommand.php",
    "backend/app/Modules/TelegramBot/Http/Controllers/Admin/TelegramBotAdminController.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
    "backend/app/Modules/TelegramBot/Services/TelegramWebhookReconcileService.php",
    "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php",
    "backend/app/Services/TelegramInfrastructureService.php",
    "backend/app/Modules/TelegramBot/TelegramBotServiceProvider.php",
    "backend/config/telegram_bot.php",
    "backend/routes/console.php",
]

uploads = [(ROOT / rel, rel) for rel in files]

c = connect(env, timeout=120)
upload_files(c, uploads, env)

cmds = f"""
set -e
cd {BE}

echo '=== 1. CLEAR CACHES ==='
php artisan config:clear
php artisan route:clear
php artisan optimize:clear

echo '=== 2. SYNC WEBHOOK SECRET ==='
php -r "
require 'vendor/autoload.php';
\\$a = require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
app(App\\\\Services\\\\TelegramInfrastructureService::class)->syncProductionBotSecret();
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
echo 'infra_secret_len=' . strlen(trim((string)(app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''))) . PHP_EOL;
echo 'bot_secret_len=' . strlen(trim((string)(\\$bot->webhook_secret ?? ''))) . PHP_EOL;
echo 'proxy_len=' . strlen(trim((string)(app(App\\\\Services\\\\TelegramInfrastructureService::class)->proxySharedToken() ?? ''))) . PHP_EOL;
"

echo '=== 3. REGISTER WEBHOOK (with allowed_updates) ==='
php artisan telegram:webhook:set production 2>&1

echo '=== 4. WEBHOOK INFO ==='
php artisan telegram:webhook:info production 2>&1

echo '=== 5. RECONCILE NOW ==='
php artisan telegram:reconcile-webhook production 2>&1

echo '=== 6. SCHEDULER CRON ==='
CRON_LINE="* * * * * cd {BE} && php artisan schedule:run >> /dev/null 2>&1"
( crontab -u www-data -l 2>/dev/null | grep -v schedule:run || true; echo "$CRON_LINE" ) | crontab -u www-data -
crontab -u www-data -l 2>/dev/null | grep schedule:run

echo '=== 7. SCHEDULE LIST ==='
php artisan schedule:list 2>&1 | grep telegram

echo '=== 8. RESTART HORIZON ==='
supervisorctl restart bahram-horizon
sleep 3
supervisorctl status bahram-horizon | head -3

echo '=== 9. WORKER ENDPOINT TEST ==='
WH=$(php -r "require 'vendor/autoload.php'; \\$a=require 'bootstrap/app.php'; \\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); echo app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? '';")
curl -sk --max-time 12 -w '\\nworker_http:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -H 'Content-Type: application/json' \\
  -d '{{\"update_id\":999999888,\"callback_query\":{{\"id\":\"t1\",\"from\":{{\"id\":1}},\"message\":{{\"message_id\":1,\"chat\":{{\"id\":1}}}},\"chat_instance\":\"1\",\"data\":\"ping\"}}}}'

echo '=== 10. LOCAL UPDATE STATS ==='
php -r "
require 'vendor/autoload.php';
\\$a = require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
echo 'pending=' . App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('status','pending')->count() . PHP_EOL;
echo 'failed=' . App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('status','failed')->count() . PHP_EOL;
echo 'callback_last=' . (App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_type','callback_query')->latest('id')->value('created_at') ?? 'none') . PHP_EOL;
" 2>&1

echo '=== DONE ==='
"""

_, out, err = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
