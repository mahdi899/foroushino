"""Deploy telegram:reconcile-webhook watchdog."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Services/TelegramWebhookReconcileService.php",
    "backend/app/Modules/TelegramBot/Console/TelegramWebhookReconcileCommand.php",
    "backend/app/Modules/TelegramBot/TelegramBotServiceProvider.php",
    "backend/config/telegram_bot.php",
    "backend/routes/console.php",
]

uploads = [(ROOT / rel, rel) for rel in files]

c = connect(env, timeout=120)
upload_files(c, uploads, env)

cmds = f"""
set -e
cd {BE}
php artisan config:clear
php artisan route:clear

echo '=== CRON schedule:run ==='
crontab -u www-data -l 2>/dev/null | grep schedule:run || echo 'MISSING schedule:run cron'

echo '=== RUN RECONCILE NOW ==='
php artisan telegram:reconcile-webhook production 2>&1

echo '=== SCHEDULE LIST (telegram) ==='
php artisan schedule:list 2>&1 | grep telegram || true
"""

_, out, err = c.exec_command(cmds, timeout=90)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
