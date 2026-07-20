"""Fix button replies: async webhook + queued outbound."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Http/Controllers/WebhookController.php",
    "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php",
    "backend/app/Modules/TelegramBot/Services/RegistrationFlowService.php",
    "backend/config/telegram.php",
]

c = connect(env, timeout=120)
upload_files(c, [(ROOT / rel, rel) for rel in files], env)

cmds = f"""
set -e
cd {BE}
grep -q '^TELEGRAM_OUTBOUND_SYNC=' .env && sed -i 's/^TELEGRAM_OUTBOUND_SYNC=.*/TELEGRAM_OUTBOUND_SYNC=false/' .env || echo 'TELEGRAM_OUTBOUND_SYNC=false' >> .env
grep -q '^TELEGRAM_HTTP_RETRY_TIMES=' .env && sed -i 's/^TELEGRAM_HTTP_RETRY_TIMES=.*/TELEGRAM_HTTP_RETRY_TIMES=4/' .env || echo 'TELEGRAM_HTTP_RETRY_TIMES=4' >> .env

php artisan config:clear
php artisan route:clear
composer dump-autoload -o --no-interaction 2>&1 | tail -1

supervisorctl restart bahram-horizon
sleep 3

echo '=== WEBHOOK URL ==='
php artisan telegram:webhook:info production 2>&1 | grep -E 'url|pending'

echo '=== BUTTON TEST ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = random_int(900000000, 999999999);
\\$payload = json_encode(['update_id'=>\\$uid,'message'=>['message_id'=>1,'from'=>['id'=>5244383790],'chat'=>['id'=>5244383790,'type'=>'private'],'date'=>time(),'text'=>'سمینارها 🎤']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15]);
curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
sleep(3);
\\$row = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id',\\$uid)->first();
use Illuminate\\\\Support\\\\Facades\\\\Redis;
\\$q = Redis::connection()->llen('queues:telegram-replies');
echo 'http='.\\$code.' db='.(\\$row?\\$row->status->value:'missing').' replies_q='.\\$q.PHP_EOL;
" 2>&1

php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '🔘 تست دکمه async — '.date('H:i:s').' — الان سمینارها را بزن');
echo 'msg_id='.(\\$r['message_id']??'?').PHP_EOL;
" 2>&1
"""

_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
if err.read().strip():
    print("STDERR:", err.read())
c.close()
