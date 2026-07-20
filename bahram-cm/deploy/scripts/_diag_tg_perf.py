import io
import sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

cmds = [
    "cd /var/www/bahram-cm/backend && php artisan tinker --execute=\"echo App\\\\Services\\\\TelegramInfrastructureService::class;\" 2>/dev/null | head -1 || true",
    """cd /var/www/bahram-cm/backend && php -r "
require 'vendor/autoload.php';
\\$app = require 'bootstrap/app.php';
\\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$infra = app(App\\\\Services\\\\TelegramInfrastructureService::class);
echo 'mode='.(\\$infra->usesWorkerBridge()?'worker':'direct').PHP_EOL;
echo 'api='.\\$infra->telegramApiBaseUrl().PHP_EOL;
echo 'worker='.\\$infra->workerUrl().PHP_EOL;
" """,
    "redis-cli LLEN queues:telegram-inbound 2>/dev/null; redis-cli LLEN queues:telegram-replies 2>/dev/null; redis-cli LLEN queues:default 2>/dev/null",
    """cd /var/www/bahram-cm/backend && php -r "
require 'vendor/autoload.php';
\\$app = require 'bootstrap/app.php';
\\$app->make(Illuminate\\\\Contracts\\\\Console\\\\Kernel::class)->bootstrap();
\\$pending = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->where('status','pending')->count();
\\$processing = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->where('status','processing')->count();
\\$failed = App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramUpdate::query()->where('status','failed')->count();
echo \"updates pending=\\$pending processing=\\$processing failed=\\$failed\".PHP_EOL;
" """,
    "curl -sf -o /dev/null -w 'direct_tg:%{time_total}s code:%{http_code}\\n' --max-time 8 https://api.telegram.org/ || echo direct_tg_fail",
    "supervisorctl status bahram-horizon 2>/dev/null | head -3",
    "pm2 list | head -6",
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
for cmd in cmds:
    print("===", cmd[:90].replace("\n", " "), "===")
    _, out, err = c.exec_command(cmd, timeout=90)
    print(out.read().decode("utf-8", "replace"))
    e = err.read().decode("utf-8", "replace")
    if e.strip():
        print("ERR:", e[:500])
c.close()
