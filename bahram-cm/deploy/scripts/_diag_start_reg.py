#!/usr/bin/env python3
"""Trace /start registration for a real-looking update and see what gets sent."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== CONVERSATION STATE ==='
php artisan tinker --execute="
\\$a = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id', 97343715)->first();
\\$c = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramConversation::where('telegram_account_id', \\$a->id)->first();
echo json_encode([
  'account_id' => \\$a->id,
  'user_id' => \\$a->user_id,
  'phone' => \\$a->phone ?? null,
  'conv_state' => \\$c?->state?->value ?? \\$c?->state,
  'context' => \\$c?->context,
], JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT).PHP_EOL;
" 2>&1

echo '=== CALL registration->start DIRECTLY ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$a = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id', 97343715)->first();
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$a);
\\$t0 = microtime(true);
try {{
  app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\RegistrationFlowService::class)->start(\\$bot, \\$a, \\$c);
  echo 'start_ok ms='.round((microtime(true)-\\$t0)*1000).PHP_EOL;
}} catch (Throwable \\$e) {{
  echo 'start_FAIL '.\\$e->getMessage().PHP_EOL.substr(\\$e->getTraceAsString(),0,800).PHP_EOL;
}}
\\$c->refresh();
echo 'state_after='.(\\$c->state?->value ?? \\$c->state).PHP_EOL;
" 2>&1

echo '=== BOT ACTIVE? ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
echo json_encode(['is_active'=>\\$bot->is_active,'username'=>\\$bot->username], JSON_UNESCAPED_UNICODE).PHP_EOL;
" 2>&1

echo '=== RECENT REAL USER UPDATES (not diag) ==='
php artisan tinker --execute="
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id','<',777000000)
  ->orderByDesc('id')->limit(8)->get();
foreach (\\$rows as \\$r) {{
  \\$text = data_get(\\$r->payload,'message.text') ?? data_get(\\$r->payload,'callback_query.data');
  \\$from = data_get(\\$r->payload,'message.from.id') ?? data_get(\\$r->payload,'callback_query.from.id');
  echo \\$r->id.' from='.\\$from.' status='.\\$r->status->value.' text='.json_encode(\\$text, JSON_UNESCAPED_UNICODE).' at='.\\$r->received_at.PHP_EOL;
}}
" 2>&1
"""

c = connect(env, timeout=180)
_, out, _ = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
c.close()
