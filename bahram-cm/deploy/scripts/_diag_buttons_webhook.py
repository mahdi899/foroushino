"""Full webhook + button path diagnosis."""
from _deploy_common import backend_root, app_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)
APP = app_root(env)

cmds = f"""
cd {BE}

echo '=== WEBHOOK INFO (Telegram API) ==='
php artisan telegram:webhook:info production 2>&1

echo '=== INFRA / WORKER URL ==='
php artisan tinker --execute="
\\$i = app(App\\\\Services\\\\TelegramInfrastructureService::class);
echo json_encode([
  'uses_worker' => \\$i->usesWorkerBridge(),
  'panel_base' => \\$i->panelBaseUrl(),
  'api_base' => \\$i->telegramApiBaseUrl(),
  'webhook_base' => \\$i->webhookBaseUrl(),
  'backend_origin' => \\$i->backendOrigin(),
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
" 2>&1

echo '=== RECENT UPDATES (last 20 min) ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('telegram_bot_id',\\$bot->id)
  ->where('received_at','>=',now()->subMinutes(20))
  ->orderByDesc('id')->limit(25)
  ->get(['id','update_id','update_type','status','received_at','error_message','payload']);
echo 'count='.\\$rows->count().PHP_EOL;
foreach(\\$rows as \\$r) {{
  \\$text = data_get(\\$r->payload,'message.text') ?? data_get(\\$r->payload,'callback_query.data') ?? '-';
  \\$user = data_get(\\$r->payload,'message.from.id') ?? data_get(\\$r->payload,'callback_query.from.id');
  echo \\$r->id.' uid='.\\$r->update_id.' user='.\\$user.' '.\\$r->update_type->value.' '.\\$r->status->value.' text='.mb_substr((string)\\$text,0,40).' err='.(\\$r->error_message??'').PHP_EOL;
}}
" 2>&1

echo '=== WORKER: wrong secret vs good secret ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$payload = json_encode(['update_id'=>777888001,'message'=>['message_id'=>1,'from'=>['id'=>1],'chat'=>['id'=>1,'type'=>'private'],'date'=>time(),'text'=>'x']]);
foreach (['wrong-secret', \\$secret] as \\$s) {{
  \\$ch = curl_init(\\$url);
  curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$s],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>15]);
  curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
  echo (\\$s==='wrong-secret'?'wrong':'good').'_secret_http='.\\$code.PHP_EOL;
}}
" 2>&1

echo '=== SIMULATE REAL BUTTON (5244383790) via worker ==='
php artisan tinker --execute="
\\$secret = trim((string) (app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? ''));
\\$url = 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook';
\\$uid = random_int(900000000, 999999999);
\\$payload = json_encode(['update_id'=>\\$uid,'message'=>['message_id'=>999,'from'=>['id'=>5244383790,'first_name'=>'T'],'chat'=>['id'=>5244383790,'type'=>'private'],'date'=>time(),'text'=>'سمینارها 🎤']]);
\\$t0 = microtime(true);
\\$ch = curl_init(\\$url);
curl_setopt_array(\\$ch, [CURLOPT_POST=>true,CURLOPT_POSTFIELDS=>\\$payload,CURLOPT_HTTPHEADER=>['Content-Type: application/json','X-Telegram-Bot-Api-Secret-Token: '.\\$secret],CURLOPT_RETURNTRANSFER=>true,CURLOPT_TIMEOUT=>60]);
\\$body = curl_exec(\\$ch); \\$code = curl_getinfo(\\$ch, CURLINFO_HTTP_CODE); curl_close(\\$ch);
\\$ms = round((microtime(true)-\\$t0)*1000);
\\$row = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id',\\$uid)->first();
echo 'http='.\\$code.' ms='.\\$ms.' db='.(\\$row?\\$row->status->value:'missing').' body='.\\$body.PHP_EOL;
" 2>&1

echo '=== WORKER index.js on server (first 50 lines) ==='
head -50 {APP}/worker/src/index.js

echo '=== TELEGRAM LOG ERRORS (last 15) ==='
tail -15 {BE}/storage/logs/telegram-$(date +%Y-%m-%d).log 2>/dev/null || tail -15 {BE}/storage/logs/laravel.log 2>/dev/null

echo '=== HORIZON / QUEUES ==='
php artisan tinker --execute="
use Illuminate\\\\Support\\\\Facades\\\\Redis;
\\$r = Redis::connection();
foreach(['telegram-inbound','telegram-replies'] as \\$q) echo \\$q.'='.\\$r->llen('queues:'.\\$q).PHP_EOL;
" 2>&1
"""

c = connect(env, timeout=180)
_, out, err = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
