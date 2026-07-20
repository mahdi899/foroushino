"""Apply ALL Telegram bot fixes to production server."""
from _deploy_common import ROOT, app_root, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
APP = app_root(env)

FILES = [
    "worker/src/index.js",
    "worker/wrangler.toml",
    "backend/app/Modules/TelegramBot/Http/Controllers/WebhookController.php",
    "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php",
    "backend/app/Modules/TelegramBot/Handlers/CallbackQueryHandler.php",
    "backend/app/Modules/TelegramBot/Jobs/ProcessTelegramUpdateJob.php",
    "backend/app/Modules/TelegramBot/Services/TelegramOutboundMessenger.php",
    "backend/app/Modules/TelegramBot/Services/RegistrationFlowService.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
    "backend/app/Modules/TelegramBot/Services/TelegramBotResetService.php",
    "backend/app/Modules/TelegramBot/Services/TelegramWebhookReconcileService.php",
    "backend/app/Modules/TelegramBot/Models/TelegramBot.php",
    "backend/app/Modules/TelegramBot/Http/Middleware/VerifyTelegramWebhookSecret.php",
    "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php",
    "backend/app/Modules/TelegramBot/Clients/TelegramBotClientFactory.php",
    "backend/app/Services/TelegramInfrastructureService.php",
    "backend/app/Modules/TelegramBot/Http/Controllers/Admin/TelegramBotAdminController.php",
    "backend/app/Modules/TelegramBot/Console/TelegramWebhookSetCommand.php",
    "backend/app/Modules/TelegramBot/Console/TelegramWebhookReconcileCommand.php",
    "backend/app/Modules/TelegramBot/Console/TelegramCleanupCommand.php",
    "backend/app/Modules/TelegramBot/TelegramBotServiceProvider.php",
    "backend/config/telegram_bot.php",
    "backend/routes/console.php",
    "backend/routes/telegram.php",
]

c = connect(env, timeout=180)
upload_files(c, [(ROOT / rel, rel) for rel in FILES], env)

cmds = f"""
set -e
cd {BE}

echo '=== FIX .env ==='
grep -v '{chr(123)}key{chr(125)}' .env > /tmp/env.bahram || cp .env /tmp/env.bahram
for pair in \
  'TELEGRAM_OUTBOUND_SYNC=true' \
  'TELEGRAM_UPDATE_RETENTION_HOURS=24' \
  'TELEGRAM_DELIVERY_LOG_RETENTION_HOURS=24' \
  'TELEGRAM_HTTP_CONNECT_TIMEOUT=15' \
  'TELEGRAM_HTTP_TIMEOUT=30' \
  'TELEGRAM_USER_LOCK_SECONDS=8'
do
  k="${{pair%%=*}}"
  grep -v "^$k=" /tmp/env.bahram > /tmp/env.bahram2 || true
  mv /tmp/env.bahram2 /tmp/env.bahram
  echo "$pair" >> /tmp/env.bahram
done
mv /tmp/env.bahram .env

echo '=== CACHES ==='
php artisan config:clear
php artisan route:clear
php artisan optimize:clear
composer dump-autoload -o --no-interaction 2>&1 | tail -1

echo '=== WRANGLER ==='
cd {APP}/worker && npm install --silent 2>/dev/null || true
CF=$(grep -E '^CLOUDFLARE_API_TOKEN=' {BE}/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -n "$CF" ]; then
  export CLOUDFLARE_API_TOKEN="$CF"
  npx wrangler deploy 2>&1 | tail -12
else
  echo 'SKIP wrangler — no CLOUDFLARE_API_TOKEN'
fi

cd {BE}
echo '=== QUEUE + CLEANUP ==='
php artisan queue:clear redis --queue=telegram-inbound 2>/dev/null || true
php artisan queue:clear redis --queue=telegram-replies 2>/dev/null || true
php artisan queue:flush 2>/dev/null || true
php artisan telegram:cleanup --hours=1 2>&1

echo '=== RESET + WEBHOOK ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
echo json_encode(app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\TelegramBotResetService::class)->reset(\\$bot), JSON_UNESCAPED_UNICODE);
" 2>&1
php artisan telegram:webhook:set production 2>&1
php artisan telegram:webhook:info production 2>&1

echo '=== CRON ==='
CRON_LINE="* * * * * cd {BE} && php artisan schedule:run >> /dev/null 2>&1"
( crontab -u www-data -l 2>/dev/null | grep -v schedule:run || true; echo "$CRON_LINE" ) | crontab -u www-data -
php artisan schedule:list 2>&1 | grep telegram

echo '=== HORIZON ==='
supervisorctl restart bahram-horizon
sleep 3
supervisorctl status bahram-horizon | head -2

echo '=== SMOKE ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = random_int(900000000, 999999999);
\\$payload = json_encode(['update_id'=>\\$uid,'message'=>['message_id'=>1,'from'=>['id'=>5244383790],'chat'=>['id'=>5244383790,'type'=>'private'],'date'=>time(),'text'=>'/start']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>45]);
curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
\\$row = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id',\\$uid)->first();
echo 'worker_http='.\\$code.' db='.(\\$row?\\$row->status->value:'missing').PHP_EOL;
\\$info = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first())->getWebhookInfo();
echo 'pending_remote='.(\\$info['pending_update_count']??'?').' updates='.App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::count().PHP_EOL;
" 2>&1
echo DONE
"""

_, out, err = c.exec_command(cmds, timeout=300)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
