"""Deep inbound path diagnosis."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== WEBHOOK INFO ==='
php artisan telegram:webhook:info production 2>&1

echo '=== SECRET LENGTHS (not values) ==='
php artisan tinker --execute="
\\$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
echo json_encode([
  'env_webhook_secret_len' => strlen(trim((string) env('TELEGRAM_WEBHOOK_SECRET', ''))),
  'infra_webhook_secret_len' => strlen(trim((string) (\\$infra->webhookSecret() ?? ''))),
  'bot_webhook_secret_len' => strlen(trim((string) (\\$bot->resolveWebhookSecret() ?? ''))),
  'proxy_token_len' => strlen(trim((string) (\\$infra->proxySharedToken() ?? ''))),
], JSON_PRETTY_PRINT);
" 2>&1

echo '=== RECENT INBOUND (last 10 min) ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('telegram_bot_id',\\$bot->id)
  ->where('received_at','>=',now()->subMinutes(10))
  ->orderByDesc('id')->limit(20)
  ->get(['id','update_id','update_type','status','received_at','error_message']);
echo 'count='.\\$rows->count().PHP_EOL;
foreach(\\$rows as \\$r) echo \\$r->id.' uid='.\\$r->update_id.' '.\\$r->update_type->value.' '.\\$r->status->value.' '.(\\$r->error_message ?? '').PHP_EOL;
" 2>&1

echo '=== WORKER TEST wrong secret ==='
php artisan tinker --execute="
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$payload = json_encode(['update_id'=>777000001,'message'=>['message_id'=>1,'from'=>['id'=>1],'chat'=>['id'=>1,'type'=>'private'],'date'=>time(),'text'=>'x']]);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: wrong-secret'],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15]);
\\$body = curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
echo 'wrong_secret_http='.\\$code.PHP_EOL;

\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$proxy = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->proxySharedToken() ?? ''));
\\$payload2 = json_encode(['update_id'=>777000002,'message'=>['message_id'=>2,'from'=>['id'=>97343715],'chat'=>['id'=>97343715,'type'=>'private'],'date'=>time(),'text'=>'/start']]);
\\$ch2 = curl_init(\\$url);
curl_setopt_array(\\$ch2, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload2,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30]);
\\$body2 = curl_exec(\\$ch2); \\$code2 = curl_getinfo(\\$ch2, CURLINFO_HTTP_CODE); curl_close(\\$ch2);
echo 'good_secret_worker_http='.\\$code2.' body='.substr((string)\\$body2,0,80).PHP_EOL;

\\$direct = 'https://rostami.app/api/v1/integrations/telegram/production/webhook';
\\$ch3 = curl_init(\\$direct);
curl_setopt_array(\\$ch3, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload2,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret,'Authorization: Bearer '.\\$proxy,'X-Proxy-Origin: Cloudflare-Worker'],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>30]);
\\$body3 = curl_exec(\\$ch3); \\$code3 = curl_getinfo(\\$ch3, CURLINFO_HTTP_CODE); curl_close(\\$ch3);
echo 'direct_origin_http='.\\$code3.' body='.substr((string)\\$body3,0,80).PHP_EOL;
" 2>&1

echo '=== CF TOKEN ON SERVER ==='
php artisan tinker --execute="
\\$c = app(App\\\\Services\\\\SettingService::class)->group('cache');
echo 'has_cf_token='.(empty(\\$c['cloudflare_api_token'] ?? '') ? 'no' : 'yes').PHP_EOL;
" 2>&1
"""

c = connect(env, timeout=120)
_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
