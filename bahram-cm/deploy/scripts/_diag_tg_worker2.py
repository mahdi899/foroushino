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

cmds = r"""
echo '=== TELEGRAM ENV KEYS ==='
grep -E '^(PROXY_SHARED_TOKEN|TELEGRAM_WEBHOOK|TELEGRAM_BOT|CLOUDFLARE|CF_)' /var/www/bahram-cm/backend/.env 2>/dev/null | cut -d= -f1

echo '=== DB INFRA SETTING ==='
cd /var/www/bahram-cm/backend
php -r '
require "vendor/autoload.php";
$app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$raw = app(App\Services\SettingService::class)->group("telegram")["infrastructure"] ?? [];
$mask = fn($k) => isset($raw[$k]) && $raw[$k] !== "" ? "set" : "empty";
echo "base_url=" . ($raw["base_url"] ?? $raw["webhook_base_url"] ?? "") . PHP_EOL;
echo "backend_origin=" . ($raw["backend_origin"] ?? "") . PHP_EOL;
echo "proxy_shared_token=" . $mask("proxy_shared_token") . PHP_EOL;
echo "webhook_secret=" . $mask("webhook_secret") . PHP_EOL;
echo "mode=" . ($raw["mode"] ?? "") . PHP_EOL;
' 2>&1

echo '=== WEBHOOK INFO ==='
timeout 30 php artisan telegram:webhook:info production 2>&1 | head -25

echo '=== HEALTH ==='
timeout 30 php artisan telegram:health-check 2>&1 | head -30

echo '=== NGINX WEBHOOK ==='
grep -A8 'integrations/telegram' /etc/nginx/sites-enabled/rostami-app.conf 2>/dev/null | head -12
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, err = c.exec_command(cmds, timeout=90)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
