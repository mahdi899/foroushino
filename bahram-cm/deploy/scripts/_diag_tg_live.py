"""Live diag: simulate button + check outbound + recent updates."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== ENV ==='
grep -E '^(TELEGRAM_OUTBOUND_SYNC|TELEGRAM_USER_LOCK|TELEGRAM_WEBHOOK|QUEUE_CONNECTION|REDIS_)' .env 2>/dev/null | sed 's/=.*/=***/'

echo '=== WEBHOOK INFO ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot);
echo json_encode(\\$c->getWebhookInfo(), JSON_UNESCAPED_UNICODE);
" 2>&1

echo '=== RECENT UPDATES (last 15) ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('telegram_bot_id',\\$bot->id)->orderByDesc('id')->limit(15)->get(['id','update_type','status','received_at','processed_at','error_message']);
foreach(\\$rows as \\$r) echo \\$r->id.' '.\\$r->update_type->value.' '.\\$r->status->value.' '.(\\$r->error_message ?? '').PHP_EOL;
" 2>&1

echo '=== LIVE BUTTON TEST (admin 97343715) ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$acc = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id',97343715)->where('telegram_bot_id',\\$bot->id)->first();
\\$conv = app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$acc);
echo 'state='.\\$conv->state->value.PHP_EOL;
\\$payload=['update_id'=>888877920,'message'=>['message_id'=>999920,'from'=>['id'=>97343715,'first_name'=>'Test'],'chat'=>['id'=>97343715,'type'=>'private'],'date'=>time(),'text'=>'سمینارها 🎤']];
\\$u=app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\UpdateIngestService::class)->ingest(\\$bot,\\$payload);
if(\\$u) app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\UpdateRouter::class)->route(\\$u,\\$bot);
echo 'update_status='.(\\$u?\\$u->fresh()->status->value:'null').PHP_EOL;
" 2>&1

echo '=== OUTBOUND SEND TEST ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot);
\\$r = \\$c->sendMessage(97343715, '✅ تست پس از پاکسازی صف — '.date('H:i:s'));
echo json_encode(\\$r, JSON_UNESCAPED_UNICODE);
" 2>&1

echo '=== HORIZON QUEUE SIZES ==='
php artisan tinker --execute="
use Illuminate\\\\Support\\\\Facades\\\\Redis;
\\$conn = Redis::connection();
foreach(['telegram-inbound','telegram-replies','default'] as \\$q) {{
  try {{ echo \\$q.'='.\\$conn->llen('queues:'.\\$q).PHP_EOL; }} catch(Throwable \\$e) {{ echo \\$q.'=err'.PHP_EOL; }}
}}
" 2>&1

echo '=== LARAVEL LOG (telegram last 20) ==='
grep -i telegram storage/logs/laravel.log 2>/dev/null | tail -20 || echo 'no log lines'
"""

c = connect(env, timeout=120)
_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
