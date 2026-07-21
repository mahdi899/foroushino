"""Telegram reply path + horizon status."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== HORIZON / SUPERVISOR ==='
supervisorctl status bahram-horizon bahram-queue:* 2>&1 | head -20

echo '=== REDIS QUEUE LENGTHS ==='
php artisan tinker --execute="
use Illuminate\\\\Support\\\\Facades\\\\Redis;
foreach (['telegram-inbound','telegram-replies','telegram-transactional','telegram-broadcast'] as \\$q) {{
  echo \\$q.':'.Redis::llen('queues:' . \\$q).PHP_EOL;
}}
" 2>&1

echo '=== TELEGRAM_OUTBOUND_SYNC ==='
grep TELEGRAM_OUTBOUND_SYNC .env 2>/dev/null || echo 'not set (default false)'

echo '=== RECENT DELIVERY / FAILED ==='
php artisan tinker --execute="
\\$rows = DB::table('telegram_message_deliveries')
  ->orderByDesc('id')->limit(8)
  ->get(['id','status','telegram_user_id','error_message','created_at']);
foreach(\\$rows as \\$r) echo json_encode(\\$r).PHP_EOL;
" 2>&1

echo '=== RECENT FAILED UPDATES ==='
php artisan tinker --execute="
\\$rows = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('status','failed')
  ->orderByDesc('id')->limit(5)->get(['id','update_id','error_message','received_at']);
foreach(\\$rows as \\$r) echo \\$r->id.' '.\\$r->update_id.' '.(\\$r->error_message ?? '').PHP_EOL;
" 2>&1

echo '=== SITE / NEXT ==='
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/ || echo next_down
curl -sf -o /dev/null -w 'laravel:%{{http_code}}\\n' http://127.0.0.1:8010/up
"""

c = connect(env, timeout=120)
_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
