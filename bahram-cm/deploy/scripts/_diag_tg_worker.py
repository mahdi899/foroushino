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
echo '=== TELEGRAM ENV (masked) ==='
grep -E '^(PROXY_SHARED_TOKEN|TELEGRAM_WEBHOOK|TELEGRAM_BOT|TELEGRAM_.*URL|BAHRAM_FRONTEND)' /var/www/bahram-cm/backend/.env 2>/dev/null | sed 's/=.*/=***/'

echo '=== INFRA FROM DB (via artisan) ==='
cd /var/www/bahram-cm/backend
php artisan tinker --execute="
\$s = app(\App\Services\TelegramInfrastructureService::class);
echo 'panelBaseUrl=' . \$s->panelBaseUrl() . PHP_EOL;
echo 'usesWorker=' . (\$s->usesWorkerBridge() ? 'yes' : 'no') . PHP_EOL;
echo 'webhookBaseUrl=' . \$s->webhookBaseUrl() . PHP_EOL;
echo 'telegramApiBaseUrl=' . \$s->telegramApiBaseUrl() . PHP_EOL;
echo 'backendOrigin=' . \$s->backendOrigin() . PHP_EOL;
echo 'proxySharedTokenSet=' . (\$s->proxySharedToken() ? 'yes' : 'no') . PHP_EOL;
echo 'webhookSecretSet=' . (\$s->webhookSecret() ? 'yes' : 'no') . PHP_EOL;
" 2>&1

echo '=== WEBHOOK INFO ==='
php artisan telegram:webhook:info production 2>&1 | head -30

echo '=== HEALTH ==='
php artisan telegram:health 2>&1 | head -40

echo '=== WORKER PROBE (if URL known) ==='
WORKER=$(php artisan tinker --execute="echo app(\App\Services\TelegramInfrastructureService::class)->panelBaseUrl();" 2>/dev/null | tail -1)
echo "worker_base=$WORKER"
if [ -n "$WORKER" ] && [ "$WORKER" != "https://api.telegram.org" ]; then
  curl -sk -o /dev/null -w 'worker_get:%{http_code}\n' "$WORKER/" 2>&1 || true
  curl -sk -o /dev/null -w 'worker_webhook_post:%{http_code}\n' -X POST "$WORKER/api/v1/integrations/telegram/production/webhook" -H 'Content-Type: application/json' -d '{}' 2>&1 || true
fi

echo '=== DIRECT WEBHOOK ON ORIGIN ==='
curl -sk -o /dev/null -w 'origin_webhook:%{http_code}\n' -X POST 'https://rostami.app/api/v1/integrations/telegram/production/webhook' -H 'Content-Type: application/json' -d '{}' 2>&1

echo '=== CF CREDS IN ENV ==='
grep -E '^(CLOUDFLARE|CF_)' /var/www/bahram-cm/backend/.env 2>/dev/null | sed 's/=.*/=***/'

echo '=== WORKER DIR ==='
ls -la /var/www/bahram-cm/worker/ 2>/dev/null | head -10
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
