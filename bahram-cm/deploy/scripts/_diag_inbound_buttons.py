"""Check if button presses (message + callback_query) reach the server."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
BE = backend_root(load_deploy_env())
c = connect(load_deploy_env())

cmds = f"""
cd {BE}

echo '=== LAST 15 UPDATES (all types) ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$rows=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->orderByDesc('id')->limit(15)->get();
foreach(\\$rows as \\$u){{
  \\$t=\\$u->update_type->value;
  \\$s=\\$u->status->value;
  if(\\$t==='message') \\$d=data_get(\\$u->payload,'message.text','[media]');
  elseif(\\$t==='callback_query') \\$d=data_get(\\$u->payload,'callback_query.data','');
  else \\$d='';
  echo \\$u->id.' '.\\$u->received_at.' '.\\$t.' '.\\$s.' '.mb_substr((string)\\$d,0,50).PHP_EOL;
  if(\\$u->error_message) echo '  ERR:'.substr(\\$u->error_message,0,100).PHP_EOL;
}}
"

echo '=== COUNTS BY TYPE (last hour) ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$since=now()->subHour();
foreach(['message','callback_query'] as \\$type){{
  \\$c=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_type',\\$type)->where('received_at','>=',\\$since)->count();
  echo \\$type.'='.\\$c.PHP_EOL;
}}
"

echo '=== SIMULATE MENU BUTTON (message text) ==='
WH=$(php -r "require 'vendor/autoload.php'; \\$a=require 'bootstrap/app.php'; \\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap(); echo app(App\\\\Services\\\\TelegramInfrastructureService::class)->webhookSecret()??'';")
PROXY=$(grep '^PROXY_SHARED_TOKEN=' .env | cut -d= -f2-)
TS=$(date +%s)
curl -sk --max-time 15 -w '\\nmenu_msg:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -H 'Content-Type: application/json' \\
  -d "{{\\"update_id\\":888877801,\\"message\\":{{\\"message_id\\":99002,\\"from\\":{{\\"id\\":97343715,\\"first_name\\":\\"Admin\\"}},\\"chat\\":{{\\"id\\":97343715,\\"type\\":\\"private\\"}},\\"date\\":$TS,\\"text\\":\\"دوره کمپین نویسی 🎓\\"}}}}"

sleep 4

echo '=== SIMULATE INLINE CALLBACK ==='
curl -sk --max-time 15 -w '\\ncallback:%{{http_code}}\\n' -X POST 'https://broken-mountain-6b4f.shokspy.workers.dev/api/v1/integrations/telegram/production/webhook' \\
  -H "X-Telegram-Bot-Api-Secret-Token: $WH" \\
  -H 'Content-Type: application/json' \\
  -d "{{\\"update_id\\":888877802,\\"callback_query\\":{{\\"id\\":\\"cb_test_99\\",\\"from\\":{{\\"id\\":97343715}},\\"message\\":{{\\"message_id\\":100,\\"chat\\":{{\\"id\\":97343715,\\"type\\":\\"private\\"}}}},\\"chat_instance\\":\\"1\\",\\"data\\":\\"support:cat:other\\"}}}}"

sleep 4

echo '=== AFTER SIMULATIONS ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
foreach([888877801,888877802] as \\$uid){{
  \\$u=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('update_id',\\$uid)->first();
  echo \\$uid.' => '.(\\$u ? \\$u->status->value : 'NOT INGESTED');
  if(\\$u && \\$u->error_message) echo ' ERR='.substr(\\$u->error_message,0,80);
  echo PHP_EOL;
}}
"

echo '=== WORKER DEDUPE CHECK ==='
grep -E 'TELEGRAM_DEDUPE|DEDUPE' /var/www/bahram-cm/worker/wrangler.toml 2>/dev/null | head -5
"""

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
