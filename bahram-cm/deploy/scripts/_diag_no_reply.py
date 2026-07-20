"""Inspect processed updates — why no outbound reply."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}
php artisan tinker --execute="
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::orderByDesc('id')->limit(5)->get();
foreach(\\$rows as \\$u) {{
  \\$text = data_get(\\$u->payload, 'message.text') ?? data_get(\\$u->payload, 'callback_query.data') ?? '?';
  \\$uid = data_get(\\$u->payload, 'message.from.id') ?? data_get(\\$u->payload, 'callback_query.from.id');
  echo 'id='.\\$u->id.' tg_uid='.\\$u->update_id.' user='.\\$uid.' type='.\\$u->update_type->value.' status='.\\$u->status->value.' text='.\\$text.PHP_EOL;
}}
" 2>&1

echo '=== DELIVERY LOGS (recent) ==='
php artisan tinker --execute="
if(!Schema::hasTable('telegram_delivery_logs')) {{ echo 'no table'.PHP_EOL; return; }}
\\$rows = DB::table('telegram_delivery_logs')->orderByDesc('id')->limit(10)->get();
foreach(\\$rows as \\$r) echo json_encode((array)\\$r, JSON_UNESCAPED_UNICODE).PHP_EOL;
" 2>&1

echo '=== ACCOUNT STATE for recent users ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$uids = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::orderByDesc('id')->limit(5)->get()->map(fn(\\$u)=> data_get(\\$u->payload,'message.from.id') ?? data_get(\\$u->payload,'callback_query.from.id'))->filter()->unique();
foreach(\\$uids as \\$tg) {{
  \\$acc = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_bot_id',\\$bot->id)->where('telegram_user_id',\\$tg)->first();
  if(!\\$acc) {{ echo \\$tg.' no account'.PHP_EOL; continue; }}
  \\$conv = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramConversation::where('telegram_account_id',\\$acc->id)->first();
  echo \\$tg.' state='.(\\$conv?\\$conv->state->value:'none').' linked='.(\\$acc->isLinked()?'y':'n').' admin='.(\\$acc->isBotAdmin()?'y':'n').PHP_EOL;
}}
" 2>&1

echo '=== REPLAY LAST REAL UPDATE SYNC ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$u = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id','>',888877000)->orderByDesc('id')->first();
if(!\\$u) {{ echo 'none'.PHP_EOL; return; }}
\\$chat = data_get(\\$u->payload,'message.chat.id') ?? data_get(\\$u->payload,'callback_query.message.chat.id');
echo 'replay update_id='.\\$u->update_id.' chat='.\\$chat.PHP_EOL;
try {{
  app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\UpdateRouter::class)->route(\\$u, \\$bot);
  echo 'route ok status='.\\$u->fresh()->status->value.PHP_EOL;
}} catch(Throwable \\$e) {{ echo 'route err: '.\\$e->getMessage().PHP_EOL; }}
if(\\$chat) {{
  \\$r = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot)->sendMessage((int)\\$chat, '🔁 تست replay سرور — '.date('H:i:s'));
  echo 'manual_send message_id='.(\\$r['message_id'] ?? '?').PHP_EOL;
}}
" 2>&1

grep TELEGRAM_OUTBOUND_SYNC .env
grep TELEGRAM_API .env | head -3
"""

c = connect(env, timeout=120)
_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
