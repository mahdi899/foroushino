"""Fix /start: sync registration replies + admin bypass + flush failed jobs."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Services/RegistrationFlowService.php",
]

c = connect(env, timeout=120)
upload_files(c, [(ROOT / rel, rel) for rel in files], env)

cmds = f"""
set -e
cd {BE}

# Sync outbound on production so menu/start replies are instant
if grep -q '^TELEGRAM_OUTBOUND_SYNC=' .env; then
  sed -i 's/^TELEGRAM_OUTBOUND_SYNC=.*/TELEGRAM_OUTBOUND_SYNC=true/' .env
else
  echo 'TELEGRAM_OUTBOUND_SYNC=true' >> .env
fi

php artisan config:clear
composer dump-autoload -o --no-interaction 2>&1 | tail -1

echo '=== FLUSH FAILED JOBS ==='
php artisan queue:flush --force 2>&1 || true

echo '=== RESET BOT ==='
php artisan tinker --execute="echo json_encode(app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\TelegramBotResetService::class)->reset(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first()), JSON_UNESCAPED_UNICODE);" 2>&1

echo '=== TEST /start SYNC ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
config(['queue.default'=>'sync']);
\\$bot=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$account=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_bot_id',\\$bot->id)->where('telegram_user_id',97343715)->first();
\\$conv=app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$account);
app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\RegistrationFlowService::class)->start(\\$bot,\\$account,\\$conv);
echo 'start_sent'.PHP_EOL;
"

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
