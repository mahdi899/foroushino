"""Deploy menu button inbound/outbound fixes."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Handlers/MessageHandler.php",
    "backend/app/Modules/TelegramBot/Handlers/CallbackQueryHandler.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
    "worker/src/index.js",
]

c = connect(env, timeout=120)
upload_files(c, [(ROOT / rel, rel) for rel in files], env)

cmds = f"""
set -e
cd {BE}
php artisan config:clear
composer dump-autoload -o --no-interaction 2>&1 | tail -1

php artisan tinker --execute="echo json_encode(app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\TelegramBotResetService::class)->reset(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first()), JSON_UNESCAPED_UNICODE);" 2>&1

supervisorctl restart bahram-horizon
sleep 2

echo '=== TEST MENU BUTTON HANDLER ==='
php storage/app/_menu_probe.php 2>/dev/null || php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$bot=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
\\$acc=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramAccount::where('telegram_user_id',97343715)->where('telegram_bot_id',\\$bot->id)->first();
\\$conv=app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\ConversationService::class)->forAccount(\\$acc);
\\$payload=['update_id'=>888877910,'message'=>['message_id'=>1,'from'=>['id'=>97343715],'chat'=>['id'=>97343715,'type'=>'private'],'date'=>time(),'text'=>'سمینارها 🎤']];
\\$u=app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\UpdateIngestService::class)->ingest(\\$bot,\\$payload);
if(\\$u) app(App\\\\Modules\\\\TelegramBot\\\\Services\\\\UpdateRouter::class)->route(\\$u,\\$bot);
echo 'seminar_btn status='.(\\$u?\\$u->fresh()->status->value:'dup').PHP_EOL;
"
"""

_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
if err.read().decode().strip():
    print("STDERR:", err.read())
c.close()
