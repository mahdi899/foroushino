"""Continue full deploy: frontend build with swap + services restart."""
import io
import sys
import time
from pathlib import Path

import paramiko

from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

remote = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-frontend-build.log
exec > >(tee "$LOG") 2>&1
echo "=== FRONTEND BUILD $(date -Is) ==="

if ! swapon --show | grep -q swapfile; then
  swapoff /swapfile 2>/dev/null || true
  rm -f /swapfile
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=progress
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
free -h

export NODE_OPTIONS="--max-old-space-size=2048"
cd {APP}/frontend
unset NODE_ENV
if ! npm ci; then npm install --no-audit --no-fund; fi
export NODE_ENV=production
npm run build
test -f .next/BUILD_ID && echo BUILD_OK

echo '==> PM2'
pm2 reload {APP}/deploy/pm2/ecosystem.config.cjs --update-env || pm2 start {APP}/deploy/pm2/ecosystem.config.cjs

echo '==> Worker'
cd {APP}/worker
npm install --silent 2>/dev/null || true
CF=$(grep -E '^CLOUDFLARE_API_TOKEN=' {BE}/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -n "$CF" ]; then
  export CLOUDFLARE_API_TOKEN="$CF"
  npx wrangler deploy 2>&1 | tail -10
else
  echo 'SKIP wrangler'
fi

echo '==> Telegram + Horizon'
cd {BE}
php artisan telegram:webhook:set production 2>&1 | tail -3
supervisorctl restart bahram-horizon bahram-queue:* bahram-family-queue:* bahram-scheduler 2>/dev/null || supervisorctl restart bahram-horizon
php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '🏗 بیلد کامل شد — '.date('H:i:s').' — /start بزن');
echo 'msg_id='.(\\$r['message_id']??'?').PHP_EOL;
" 2>&1

echo '==> Health'
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK || echo LARAVEL_FAIL
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/ || echo NEXT_FAIL
curl -sf -o /dev/null -w "SITE:%{{http_code}}\\n" -H "Host: rostami.app" http://127.0.0.1/ || echo SITE_FAIL
echo DONE
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-frontend-build.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-frontend-build.sh", 0o755)
sftp.close()

print("Frontend build with swap started...")
c.exec_command("nohup bash /tmp/bahram-frontend-build.sh; echo $? > /tmp/bahram-frontend-build.done")

for i in range(80):
    time.sleep(15)
    _, out, _ = c.exec_command(
        "test -f /tmp/bahram-frontend-build.done && cat /tmp/bahram-frontend-build.done || echo running",
        timeout=10,
    )
    status = out.read().decode().strip()
    if status != "running":
        print(f"Finished exit={status}")
        break
    if i % 4 == 0:
        _, tail, _ = c.exec_command("tail -2 /tmp/bahram-frontend-build.log 2>/dev/null", timeout=10)
        t = tail.read().decode("utf-8", "replace").strip()
        if t:
            print("...", t.split("\n")[-1][:100])

_, log_out, _ = c.exec_command("tail -50 /tmp/bahram-frontend-build.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
