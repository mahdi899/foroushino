#!/usr/bin/env python3
"""Check outbound send path and start handler result."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== OUTBOUND getMe VIA WORKER ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$client = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot);
\\$t0 = microtime(true);
try {{
  \\$me = \\$client->getMe();
  echo 'getMe_ok username='.(\\$me['username'] ?? '?').' ms='.round((microtime(true)-\\$t0)*1000).PHP_EOL;
}} catch (Throwable \\$e) {{
  echo 'getMe_FAIL '.\\$e->getMessage().PHP_EOL;
}}
" 2>&1

echo '=== SEND TEST MESSAGE ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$client = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(\\$bot);
\\$chat = 97343715;
\\$t0 = microtime(true);
try {{
  \\$r = \\$client->sendMessage(\\$chat, 'تست تشخیص /start — اگر این را می‌بینی outbound سالم است', ['disable_notification' => true]);
  echo 'send_ok mid='.json_encode(\\$r['message_id'] ?? \\$r).' ms='.round((microtime(true)-\\$t0)*1000).PHP_EOL;
}} catch (Throwable \\$e) {{
  echo 'send_FAIL '.\\$e->getMessage().PHP_EOL;
}}
" 2>&1

echo '=== LAST UPDATE PAYLOAD TYPE ==='
php artisan tinker --execute="
\\$u = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::orderByDesc('id')->first();
echo 'id='.\\$u->id.' type='.\\$u->update_type->value.' status='.\\$u->status->value.PHP_EOL;
\\$text = data_get(\\$u->payload, 'message.text');
echo 'text='.json_encode(\\$text).PHP_EOL;
echo 'from='.json_encode(data_get(\\$u->payload, 'message.from.id')).PHP_EOL;
" 2>&1

echo '=== ACCOUNT FOR 97343715 ==='
php artisan tinker --execute="
\\$a = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id', 97343715)->first();
if (!\\$a) {{ echo 'no_account'.PHP_EOL; return; }}
echo json_encode([
  'id' => \\$a->id,
  'user_id' => \\$a->user_id,
  'state' => \\$a->conversation_state ?? \\$a->state ?? null,
  'blocked' => \\$a->is_blocked ?? null,
  'updated_at' => (string) \\$a->updated_at,
], JSON_UNESCAPED_UNICODE).PHP_EOL;
" 2>&1

echo '=== HORIZON STATUS ==='
supervisorctl status bahram-horizon 2>&1 | head -3

echo '=== PHP-FPM / nginx errors ==='
tail -20 /var/log/nginx/error.log 2>/dev/null | grep -i telegram || tail -5 /var/log/nginx/error.log 2>/dev/null
"""

c = connect(env, timeout=180)
_, out, _ = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
c.close()
