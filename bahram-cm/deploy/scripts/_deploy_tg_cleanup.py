"""Deploy hourly telegram log cleanup."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Console/TelegramCleanupCommand.php",
    "backend/config/telegram_bot.php",
    "backend/routes/console.php",
]

c = connect(env, timeout=120)
upload_files(c, [(ROOT / rel, rel) for rel in files], env)

cmds = f"""
set -e
cd {BE}
grep -q '^TELEGRAM_UPDATE_RETENTION_HOURS=' .env || echo 'TELEGRAM_UPDATE_RETENTION_HOURS=24' >> .env
php artisan config:clear

echo '=== BEFORE ==='
php artisan tinker --execute="echo 'updates='.App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::count().PHP_EOL;" 2>&1

echo '=== RUN CLEANUP NOW ==='
php artisan telegram:cleanup 2>&1

echo '=== AFTER ==='
php artisan tinker --execute="echo 'updates='.App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::count().PHP_EOL;" 2>&1

php artisan schedule:list 2>&1 | grep telegram:cleanup || true
"""

_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
