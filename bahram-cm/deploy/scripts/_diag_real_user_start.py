#!/usr/bin/env python3
"""Diagnose real user 5244383790 /start replies."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== ACCOUNT 5244383790 ==='
php artisan tinker --execute="
\\$a = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id', 5244383790)->first();
if (!\\$a) {{ echo 'MISSING'; return; }}
\\$c = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramConversation::where('telegram_account_id', \\$a->id)->first();
echo json_encode([
  'id' => \\$a->id,
  'user_id' => \\$a->user_id,
  'is_bot_admin' => method_exists(\\$a,'isBotAdmin') ? \\$a->isBotAdmin() : null,
  'mobile' => \\$a->mobile ?? \\$a->phone ?? null,
  'mobile_verified_at' => (string) (\\$a->mobile_verified_at ?? ''),
  'display_name' => \\$a->display_name,
  'conv_state' => \\$c?->state?->value ?? \\$c?->state,
  'context' => \\$c?->context,
], JSON_UNESCAPED_UNICODE|JSON_PRETTY_PRINT).PHP_EOL;
" 2>&1

echo '=== QUEUE MESSAGE IMPL ==='
sed -n '442,460p' app/Modules/TelegramBot/Services/RegistrationFlowService.php

echo '=== REDIS telegram-replies ==='
php artisan tinker --execute="
use Illuminate\\\\Support\\\\Facades\\\\Redis;
echo 'llen='.Redis::llen('queues:telegram-replies').PHP_EOL;
echo 'delayed='.Redis::zcard('queues:telegram-replies:delayed').PHP_EOL;
echo 'reserved='.Redis::zcard('queues:telegram-replies:reserved').PHP_EOL;
" 2>&1

echo '=== FAILED JOBS ==='
php artisan tinker --execute="
\\$n = DB::table('failed_jobs')->count();
echo 'failed_jobs='.\\$n.PHP_EOL;
\\$rows = DB::table('failed_jobs')->orderByDesc('id')->limit(5)->get(['id','queue','exception','failed_at']);
foreach (\\$rows as \\$r) {{
  echo \\$r->id.' q='.\\$r->queue.' at='.\\$r->failed_at.' ex='.substr(\\$r->exception,0,200).PHP_EOL;
}}
" 2>&1

echo '=== FORCE START FOR REAL USER ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$a = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id', 5244383790)->first();
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$a);
\\$t0 = microtime(true);
try {{
  app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\RegistrationFlowService::class)->start(\\$bot, \\$a, \\$c);
  echo 'start_ok ms='.round((microtime(true)-\\$t0)*1000).PHP_EOL;
}} catch (Throwable \\$e) {{
  echo 'start_FAIL '.\\$e->getMessage().PHP_EOL;
}}
\\$c->refresh();
echo 'state='.(\\$c->state?->value ?? \\$c->state).PHP_EOL;
echo 'replies_llen='.Illuminate\\\\Support\\\\Facades\\\\Redis::llen('queues:telegram-replies').PHP_EOL;
" 2>&1

echo '=== HORIZON SUPERVISORS FOR REPLIES ==='
php artisan tinker --execute="
echo json_encode(config('horizon.defaults'), JSON_PRETTY_PRINT); 
" 2>&1 | head -5
php artisan horizon:status 2>&1
grep -n 'telegram-replies\\|telegram-inbound' config/horizon.php | head -20
"""

c = connect(env, timeout=180)
_, out, _ = c.exec_command(cmds, timeout=180)
print(out.read().decode("utf-8", "replace"))
c.close()
