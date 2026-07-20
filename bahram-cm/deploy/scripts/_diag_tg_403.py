"""Diagnose Telegram webhook 403 and allowed_updates on production."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== FULL WEBHOOK INFO ==='
php -r "
require 'vendor/autoload.php';
\\$app = require 'bootstrap/app.php';
\\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::query()->where('key','production')->first();
\\$factory = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class);
echo json_encode(\\$factory->forBot(\\$bot)->getWebhookInfo(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
" 2>&1

echo '=== SECRET ALIGNMENT (masked lengths) ==='
php -r "
require 'vendor/autoload.php';
\\$app = require 'bootstrap/app.php';
\\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
\\$bot = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::query()->where('key','production')->first();
\\$envSecret = trim((string) env('TELEGRAM_WEBHOOK_SECRET',''));
\\$botSecret = trim((string) (\\$bot->webhook_secret ?? ''));
\\$infraSecret = trim((string) (\\$infra->webhookSecret() ?? ''));
echo 'env_webhook_secret_len=' . strlen(\\$envSecret) . PHP_EOL;
echo 'bot_webhook_secret_len=' . strlen(\\$botSecret) . PHP_EOL;
echo 'infra_webhook_secret_len=' . strlen(\\$infraSecret) . PHP_EOL;
echo 'secrets_match=' . ((\\$envSecret !== '' && \\$envSecret === \\$botSecret) ? 'env=bot' : 'MISMATCH') . PHP_EOL;
\\$proxy = trim((string) (\\$infra->proxySharedToken() ?? ''));
echo 'proxy_token_len=' . strlen(\\$proxy) . PHP_EOL;
" 2>&1

echo '=== SIMULATE WORKER FORWARD (no secret) ==='
curl -sk -w '\\norigin_no_auth:%{{http_code}}\\n' -X POST 'https://rostami.app/api/v1/integrations/telegram/production/webhook' -H 'Content-Type: application/json' -d '{{\"update_id\":999999001}}' 2>&1 | tail -3

echo '=== SIMULATE WITH PROXY BEARER ONLY ==='
PROXY=$(grep '^PROXY_SHARED_TOKEN=' {BE}/.env | cut -d= -f2-)
curl -sk -w '\\norigin_bearer_only:%{{http_code}}\\n' -X POST 'https://rostami.app/api/v1/integrations/telegram/production/webhook' -H "Authorization: Bearer $PROXY" -H 'Content-Type: application/json' -d '{{\"update_id\":999999002}}' 2>&1 | tail -3

echo '=== SIMULATE FULL WORKER HEADERS ==='
WH=$(grep '^TELEGRAM_WEBHOOK_SECRET=' {BE}/.env | cut -d= -f2-)
curl -sk -w '\\norigin_full:%{{http_code}}\\n' -X POST 'https://rostami.app/api/v1/integrations/telegram/production/webhook' \\
  -H "Authorization: Bearer $PROXY" \\
  -H 'X-Proxy-Origin: Cloudflare-Worker' \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -H 'Content-Type: application/json' \\
  -d '{{\"update_id\":999999003,\"message\":{{\"message_id\":1,\"from\":{{\"id\":1}},\"chat\":{{\"id\":1,\"type\":\"private\"}},\"date\":1,\"text\":\"/start\"}}}}' 2>&1 | tail -5

echo '=== WORKER WITHOUT TELEGRAM SECRET ==='
curl -sk -w '\\nworker_no_secret:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' -H 'Content-Type: application/json' -d '{{}}' 2>&1 | tail -3

echo '=== WORKER WITH WRONG SECRET ==='
curl -sk -w '\\nworker_wrong_secret:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' -H 'X-Telegram-Bot-Api-Secret-Token: wrong' -H 'Content-Type: application/json' -d '{{\"update_id\":1}}' 2>&1 | tail -3
"""

c = connect(env, timeout=120)
_, out, err = c.exec_command(cmds, timeout=90)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
