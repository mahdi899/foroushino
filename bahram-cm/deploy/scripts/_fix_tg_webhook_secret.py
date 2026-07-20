"""Deploy webhook secret fix + sync bot column + re-register webhook."""
from _deploy_common import ROOT, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

files = [
    "backend/app/Modules/TelegramBot/Models/TelegramBot.php",
    "backend/app/Modules/TelegramBot/Http/Middleware/VerifyTelegramWebhookSecret.php",
    "backend/app/Modules/TelegramBot/Console/TelegramWebhookSetCommand.php",
    "backend/app/Modules/TelegramBot/Http/Controllers/Admin/TelegramBotAdminController.php",
    "backend/app/Modules/TelegramBot/Services/BotAdminPanelService.php",
    "backend/app/Services/TelegramInfrastructureService.php",
    "backend/app/Modules/TelegramBot/Clients/HttpTelegramBotClient.php",
]

uploads = [(ROOT / rel, rel) for rel in files]

c = connect(env, timeout=120)
upload_files(c, uploads, env)

cmds = f"""
set -e
cd {BE}
php artisan config:clear
php artisan route:clear

php -r "
require 'vendor/autoload.php';
\\$a = require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
app(App\\\\Services\\\\TelegramInfrastructureService::class)->syncProductionBotSecret();
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
echo 'bot_secret_len=' . strlen(trim((string)(\\$bot->webhook_secret ?? ''))) . PHP_EOL;
"

php artisan telegram:webhook:set production 2>&1 | tail -5
php artisan telegram:webhook:info production 2>&1 | head -12

WH=$(php -r "require 'vendor/autoload.php'; \\$a=require 'bootstrap/app.php'; \\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); echo app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret() ?? '';")
PROXY=$(grep '^PROXY_SHARED_TOKEN=' .env | cut -d= -f2-)
curl -sk --max-time 12 -w '\\nworker_test:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -H 'Content-Type: application/json' \\
  -d '{{\"update_id\":999999999,\"message\":{{\"message_id\":1,\"from\":{{\"id\":1}},\"chat\":{{\"id\":1,\"type\":\"private\"}},\"date\":1,\"text\":\"ping\"}}}}'

supervisorctl restart bahram-horizon
"""

_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
