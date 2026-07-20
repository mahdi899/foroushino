"""Diagnose Telegram webhook 403 — fast probes with curl timeouts."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== WEBHOOK INFO JSON ==='
php artisan telegram:webhook:info production 2>&1

echo '=== SECRET LENS ==='
php -r "require 'vendor/autoload.php'; \\$a=require 'bootstrap/app.php'; \\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); \\$b=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first(); \\$e=trim((string)env('TELEGRAM_WEBHOOK_SECRET','')); \\$s=trim((string)(\\$b->webhook_secret??'')); echo 'env_len='.strlen(\\$e).' bot_len='.strlen(\\$s).' match='.(\\$e===\\$s&&\\$e!==''?'yes':'NO').PHP_EOL; \\$p=app(App\\\\Services\\\\TelegramInfrastructureService::class)->proxySharedToken(); echo 'proxy_len='.strlen(trim((string)(\\$p??''))).PHP_EOL;" 2>&1

echo '=== ORIGIN NO AUTH ==='
curl -sk --max-time 8 -w 'code:%{{http_code}}\\n' -o /tmp/tg1.txt -X POST 'https://rostami.app/api/v1/integrations/telegram/production/webhook' -H 'Content-Type: application/json' -d '{{\"update_id\":999999001}}'
head -c 120 /tmp/tg1.txt; echo

echo '=== ORIGIN FULL HEADERS ==='
PROXY=$(grep '^PROXY_SHARED_TOKEN=' {BE}/.env | cut -d= -f2-)
WH=$(grep '^TELEGRAM_WEBHOOK_SECRET=' {BE}/.env | cut -d= -f2-)
curl -sk --max-time 8 -w 'code:%{{http_code}}\\n' -o /tmp/tg2.txt -X POST 'https://rostami.app/api/v1/integrations/telegram/production/webhook' -H "Authorization: Bearer $PROXY" -H 'X-Proxy-Origin: Cloudflare-Worker' -H "X-Telegram-Bot-Api-Secret-Token: $WH" -H 'Content-Type: application/json' -d '{{\"update_id\":999999003}}'
head -c 120 /tmp/tg2.txt; echo

echo '=== WORKER NO SECRET ==='
curl -sk --max-time 8 -w 'code:%{{http_code}}\\n' -o /tmp/tg3.txt -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' -H 'Content-Type: application/json' -d '{{}}'
head -c 80 /tmp/tg3.txt; echo

echo '=== WORKER WITH ENV SECRET ==='
curl -sk --max-time 12 -w 'code:%{{http_code}}\\n' -o /tmp/tg4.txt -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' -H "X-Telegram-Bot-Api-Secret-Token: $WH" -H 'Content-Type: application/json' -d '{{\"update_id\":999999004,\"callback_query\":{{\"id\":\"1\",\"from\":{{\"id\":1}},\"message\":{{\"message_id\":1,\"chat\":{{\"id\":1}}}},\"chat_instance\":\"1\",\"data\":\"test\"}}}}'
head -c 120 /tmp/tg4.txt; echo
"""

c = connect(env, timeout=120)
chan = c.get_transport().open_session()
chan.settimeout(85)
chan.exec_command(cmds)
buf = b""
while True:
    if chan.recv_ready():
        buf += chan.recv(4096)
    elif chan.exit_status_ready():
        while chan.recv_ready():
            buf += chan.recv(4096)
        break
print(buf.decode("utf-8", "replace"))
c.close()
