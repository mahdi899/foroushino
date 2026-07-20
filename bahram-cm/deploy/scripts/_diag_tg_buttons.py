"""Quick Telegram bot diagnostics — webhook allowed_updates, queues, recent callbacks."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
set -e
cd {BE}

echo '=== WEBHOOK INFO (allowed_updates) ==='
php artisan telegram:webhook:info production 2>&1 | grep -E 'url|allowed_updates|pending_update|last_error|has_custom_certificate' || php artisan telegram:webhook:info production 2>&1 | head -15

echo '=== HORIZON / QUEUES ==='
supervisorctl status bahram-horizon 2>&1 | head -3
php artisan queue:monitor telegram-inbound telegram-replies default 2>&1 | head -10 || true

echo '=== RECENT CALLBACK UPDATES ==='
php artisan tinker --execute="
echo 'callback_pending=' . \\App\\Modules\\TelegramBot\\Models\\TelegramUpdate::query()->where('update_type','callback_query')->where('status','pending')->count() . PHP_EOL;
echo 'callback_failed=' . \\App\\Modules\\TelegramBot\\Models\\TelegramUpdate::query()->where('update_type','callback_query')->where('status','failed')->count() . PHP_EOL;
echo 'callback_last=' . (\\App\\Modules\\TelegramBot\\Models\\TelegramUpdate::query()->where('update_type','callback_query')->latest('id')->value('created_at') ?? 'none') . PHP_EOL;
echo 'message_last=' . (\\App\\Modules\\TelegramBot\\Models\\TelegramUpdate::query()->where('update_type','message')->latest('id')->value('created_at') ?? 'none') . PHP_EOL;
" 2>&1 | tail -6

echo '=== INFRA TOKENS SET ==='
php artisan tinker --execute="
\\$s = app(\\App\\Services\\TelegramInfrastructureService::class);
echo 'usesWorker=' . (\\$s->usesWorkerBridge() ? 'yes' : 'no') . PHP_EOL;
echo 'proxyToken=' . (\\$s->proxySharedToken() ? 'yes' : 'NO') . PHP_EOL;
echo 'webhookSecret=' . (\\$s->webhookSecret() ? 'yes' : 'NO') . PHP_EOL;
echo 'webhookUrl=' . \\$s->buildWebhookUrl('production') . PHP_EOL;
" 2>&1 | tail -6

echo '=== TELEGRAM LOG (last errors) ==='
tail -30 storage/logs/telegram.log 2>/dev/null | grep -iE 'error|403|callback|timeout|fail' | tail -10 || echo 'no telegram.log matches'
"""

c = connect(env, timeout=120)
_, out, err = c.exec_command(cmds, timeout=90)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
