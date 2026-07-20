"""Deep Telegram bot diagnostics - queues, failed updates, logs."""
from _deploy_common import backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
BE = backend_root(env)

cmds = f"""
cd {BE}

echo '=== UPDATE COUNTS ==='
php -r "
require 'vendor/autoload.php';
\\$a=require 'bootstrap/app.php';
\\$a->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
foreach (['pending','processing','failed','processed'] as \\$s) {{
  echo \\$s.'='.App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('status',\\$s)->count().PHP_EOL;
}}
\\$f=App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::where('status','failed')->latest('id')->first();
if (\\$f) echo 'last_failed_type='.\\$f->update_type->value.' err='.substr((string)\\$f->error_message,0,200).PHP_EOL;
"

echo '=== REDIS QUEUES ==='
php artisan tinker --execute="
echo 'inbound='.(\\Illuminate\\\\Support\\\\Facades\\\\Redis::connection()->llen('queues:telegram-inbound') ?? 0).PHP_EOL;
echo 'replies='.(\\Illuminate\\\\Support\\\\Facades\\\\Redis::connection()->llen('queues:telegram-replies') ?? 0).PHP_EOL;
echo 'default='.(\\Illuminate\\\\Support\\\\Facades\\\\Redis::connection()->llen('queues:default') ?? 0).PHP_EOL;
" 2>&1 | tail -5

echo '=== WEBHOOK INFO ==='
php artisan telegram:webhook:info production 2>&1

echo '=== LAST 40 TELEGRAM LOG ==='
tail -40 storage/logs/telegram.log 2>/dev/null || echo no log

echo '=== LAST LARAVEL ERRORS (telegram) ==='
tail -100 storage/logs/laravel.log 2>/dev/null | grep -iE 'telegram|callback|ProcessTelegram' | tail -20 || true
"""

c = connect(env)
chan = c.get_transport().open_session()
chan.settimeout(90)
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
