from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
c = connect(env, timeout=120)

cmds = f"""
cd {BE}

echo '=== CF TOKEN IN PANEL SETTINGS ==='
php artisan tinker --execute="
\\$c = app(App\\\\Services\\\\SettingService::class)->group('cache');
echo 'has_cf='.(empty(\\$c['cloudflare_api_token'] ?? '')?'no':'yes len='.strlen(\\$c['cloudflare_api_token'])).PHP_EOL;
" 2>&1

echo '=== WEBHOOK SIM + QUEUE CHECK ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = random_int(900000000, 999999999);
\\$payload = json_encode(['update_id'=>\\$uid,'message'=>['message_id'=>888,'from'=>['id'=>5244383790],'chat'=>['id'=>5244383790,'type'=>'private'],'date'=>time(),'text'=>'سمینارها 🎤']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>60]);
\\$body = curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
use Illuminate\\\\Support\\\\Facades\\\\Redis;
\\$r = Redis::connection();
echo 'http='.\\$code.' replies_q='.\\$r->llen('queues:telegram-replies').' failed='.DB::table('failed_jobs')->count().PHP_EOL;
sleep(2);
echo 'after2s replies_q='.\\$r->llen('queues:telegram-replies').PHP_EOL;
" 2>&1

echo '=== TODAY sendMessage LOG ==='
grep 'sendMessage' storage/logs/telegram-2026-07-21.log 2>/dev/null | tail -10 || echo none

echo '=== OUTBOUND_SYNC ==='
grep TELEGRAM_OUTBOUND_SYNC .env
"""

_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
