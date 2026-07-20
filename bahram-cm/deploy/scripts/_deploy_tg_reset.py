"""Deploy bot reset button + callback fixes."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Services/TelegramBotResetService.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
    "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php",
    "backend/app/Modules/TelegramBot/Jobs/ProcessTelegramUpdateJob.php",
    "backend/config/telegram_bot.php",
]

uploads = [(ROOT / rel, rel) for rel in files]

c = connect(env, timeout=120)
upload_files(c, uploads, env)

cmds = f"""
set -e
cd {BE}
php artisan config:clear
composer dump-autoload -o --no-interaction 2>&1 | tail -2

echo '=== RUN RESET NOW ==='
php artisan tinker --execute="
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$r = app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\TelegramBotResetService::class)->reset(\\$bot);
echo json_encode(\\$r, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
" 2>&1

supervisorctl restart bahram-horizon
sleep 2
supervisorctl status bahram-horizon | head -2
"""

_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
