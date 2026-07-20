"""Diagnose /start flow on production."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== BOT STATUS ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$bot=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first();
echo 'active='.(\\$bot->is_active?'yes':'NO').PHP_EOL;
echo 'token='.(filled(\\$bot->resolveToken())?'yes':'NO').PHP_EOL;
echo 'webhook_secret_len='.strlen(trim((string)(\\$bot->resolveWebhookSecret()??''))).PHP_EOL;
"

echo '=== LAST 10 /start UPDATES ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$rows=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()
  ->where('update_type','message')
  ->orderByDesc('id')->limit(10)->get(['id','update_id','status','error_message','received_at','payload']);
foreach(\\$rows as \\$u){{
  \\$t=data_get(\\$u->payload,'message.text','');
  if(!str_starts_with(\\$t,'/start') && \\$t!=='/start') continue;
  echo \\$u->id.' status='.\\$u->status->value.' at='.\\$u->received_at.' text='.\\$t;
  if(\\$u->error_message) echo ' ERR='.substr(\\$u->error_message,0,120);
  echo PHP_EOL;
}}
"

echo '=== UPDATE STATUS COUNTS ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
foreach(['pending','processing','failed','processed','skipped'] as \\$s)
  echo \\$s.'='.App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('status',\\$s)->count().PHP_EOL;
"

echo '=== HORIZON ==='
supervisorctl status bahram-horizon 2>&1 | head -2

echo '=== REDIS QUEUES ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$r=Illuminate\\\\Support\\\\Facades\\\\Redis::connection();
foreach(['telegram-inbound','telegram-replies','default'] as \\$q)
  echo \\$q.'='.\\$r->llen('queues:' . \\$q).PHP_EOL;
" 2>&1

echo '=== SIMULATE /start VIA WORKER ==='
WH=$(grep '^TELEGRAM_WEBHOOK_SECRET=' .env 2>/dev/null | cut -d= -f2-)
if [ -z "$WH" ]; then
  WH=$(php -r "require 'vendor/autoload.php'; \\$a=require 'bootstrap/app.php'; \\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); echo app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret()??'';")
fi
curl -sk --max-time 15 -w '\\nhttp:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -H 'Content-Type: application/json' \\
  -d '{{"update_id":888877701,"message":{{"message_id":99001,"from":{{"id":97343715,"first_name":"Admin","is_bot":false}},"chat":{{"id":97343715,"type":"private","first_name":"Admin"}},"date":'.$(date +%s).',"text":"/start"}}}}'

sleep 3

echo '=== AFTER SIMULATED /start ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$u=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id',888877701)->first();
if(!\\$u){{ echo 'update NOT ingested'.PHP_EOL; exit; }}
echo 'status='.\\$u->status->value.PHP_EOL;
if(\\$u->error_message) echo 'error='.\\$u->error_message.PHP_EOL;
"

echo '=== TELEGRAM + LARAVEL LOG TAIL ==='
tail -30 storage/logs/telegram.log 2>/dev/null || echo no telegram log
tail -50 storage/logs/laravel.log 2>/dev/null | tail -20
"""

c = connect(env)
chan = c.get_transport().open_session()
chan.settimeout(120)
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
