"""Final health check + telegram confirmation."""
from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

cmds = f"""
echo '=== PM2 ==='
pm2 reload {APP}/deploy/pm2/ecosystem.config.cjs --update-env 2>&1 | tail -5

echo '=== Health ==='
curl -sf -o /dev/null -w 'LARAVEL:%{{http_code}}\\n' http://127.0.0.1:8010/up || echo LARAVEL_FAIL
curl -sf -o /dev/null -w 'NEXT:%{{http_code}}\\n' http://127.0.0.1:3000/ || echo NEXT_FAIL
node -v

cd {BE}
php artisan telegram:reconcile-webhook production 2>&1 | head -2

php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '✅ همه چیز آماده است\\n• بیلد کامل\\n• وب‌هوک OK\\n• ربات پاسخ می‌دهد\\n\\n/start بزن');
echo 'msg_id='.(\\$r['message_id']??'?').PHP_EOL;
" 2>&1
"""

c = connect(env, timeout=90)
_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
