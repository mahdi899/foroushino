"""Deploy dumb worker relay + outbound transport fallback fixes."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")

files = [
    "worker/src/index.js",
    "worker/wrangler.toml",
    "backend/app/Modules/TelegramBot/Services/TelegramOutboundMessenger.php",
    "backend/app/Modules/TelegramBot/Services/RegistrationFlowService.php",
    "backend/app/Modules/TelegramBot/Jobs/ProcessTelegramUpdateJob.php",
    "backend/routes/telegram.php",
]

c = connect(env, timeout=180)
upload_files(c, [(ROOT / rel, rel) for rel in files], env)

cmds = f"""
set -e
cd {BE}

# Longer HTTP timeouts for worker bridge from Iran origin
grep -q '^TELEGRAM_HTTP_CONNECT_TIMEOUT=' .env && sed -i 's/^TELEGRAM_HTTP_CONNECT_TIMEOUT=.*/TELEGRAM_HTTP_CONNECT_TIMEOUT=15/' .env || echo 'TELEGRAM_HTTP_CONNECT_TIMEOUT=15' >> .env
grep -q '^TELEGRAM_HTTP_TIMEOUT=' .env && sed -i 's/^TELEGRAM_HTTP_TIMEOUT=.*/TELEGRAM_HTTP_TIMEOUT=30/' .env || echo 'TELEGRAM_HTTP_TIMEOUT=30' >> .env

php artisan config:clear
php artisan route:clear
composer dump-autoload -o --no-interaction 2>&1 | tail -1

echo '=== WRANGLER DEPLOY ==='
cd {APP}/worker
npm install --silent 2>/dev/null || true
CF=$(grep -E '^CLOUDFLARE_API_TOKEN=' {BE}/.env 2>/dev/null | cut -d= -f2- | tr -d '\\"' || true)
if [ -n "$CF" ]; then
  export CLOUDFLARE_API_TOKEN="$CF"
  npx wrangler deploy 2>&1 | tail -15
else
  echo 'SKIP wrangler deploy — set CLOUDFLARE_API_TOKEN in backend/.env to auto-deploy worker'
fi

cd {BE}
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$client = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot);
\\$client->deleteWebhook(true);
\\$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
\\$infra->syncProductionBotSecret();
\\$bot->refresh();
\\$url = \\$infra->buildWebhookUrl('production');
\\$client->setWebhook(\\$url, \\$bot->resolveWebhookSecret());
echo json_encode(\\$client->getWebhookInfo(), JSON_UNESCAPED_UNICODE);
" 2>&1

supervisorctl restart bahram-horizon
sleep 2
supervisorctl status bahram-horizon | head -2

echo '=== LIVE TEST ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = random_int(900000000, 999999999);
\\$payload = json_encode(['update_id'=>\\$uid,'message'=>['message_id'=>1,'from'=>['id'=>5244383790],'chat'=>['id'=>5244383790,'type'=>'private'],'date'=>time(),'text'=>'/start']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>45]);
\\$body = curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
echo 'worker_inbound_http='.\\$code.' body='.\\$body.PHP_EOL;
\\$row = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id',\\$uid)->first();
echo 'db='.(\\$row?\\$row->status->value:'missing').PHP_EOL;
" 2>&1
"""

_, out, err = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
