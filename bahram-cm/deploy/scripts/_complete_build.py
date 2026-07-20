"""Complete production build: frontend with swap + services restart."""
import time

from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

remote = f"""#!/bin/bash
set -uo pipefail
LOG=/tmp/bahram-complete-build.log
exec > >(tee "$LOG") 2>&1
echo "=== COMPLETE BUILD $(date -Is) ==="

# Swap for Next.js build
if ! swapon --show | grep -q swapfile; then
  swapoff /swapfile 2>/dev/null || true
  rm -f /swapfile
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi
free -h

export NODE_OPTIONS="--max-old-space-size=2560"
cd {APP}/frontend
unset NODE_ENV
npm ci
export NODE_ENV=production
npm run build
test -f .next/BUILD_ID && echo BUILD_OK || {{ echo BUILD_FAIL; exit 1; }}

echo '==> PM2'
pm2 reload {APP}/deploy/pm2/ecosystem.config.cjs --update-env || pm2 start {APP}/deploy/pm2/ecosystem.config.cjs

echo '==> Worker'
cd {APP}/worker
npm install --silent 2>/dev/null || true
CF=$(grep -E '^CLOUDFLARE_API_TOKEN=' {BE}/.env 2>/dev/null | cut -d= -f2- | tr -d '"' || true)
if [ -n "$CF" ]; then
  export CLOUDFLARE_API_TOKEN="$CF"
  npx wrangler deploy 2>&1 | tail -15
else
  echo 'SKIP wrangler — no CLOUDFLARE_API_TOKEN'
fi

echo '==> Horizon + queues'
cd {BE}
supervisorctl restart bahram-horizon bahram-queue:* bahram-family-queue:* bahram-scheduler 2>/dev/null || supervisorctl restart bahram-horizon
php artisan queue:clear redis --queue=telegram-inbound --force 2>/dev/null || true
php artisan queue:clear redis --queue=telegram-replies --force 2>/dev/null || true

echo '==> Telegram notify'
php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '🏗 بیلد کامل شد — '.date('H:i:s').' — /start بزن');
echo 'msg_id='.(\\$r['message_id']??'?').PHP_EOL;
" 2>&1

echo '==> Health'
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK || echo LARAVEL_FAIL
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/ || echo NEXT_FAIL
curl -sf -o /dev/null -w "SITE:%{{http_code}}\\n" -H "Host: rostami.app" http://127.0.0.1/ || echo SITE_FAIL
echo "=== DONE $(date -Is) ==="
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-complete-build.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-complete-build.sh", 0o755)
sftp.close()

print("Starting complete build (frontend + services)...")
c.exec_command("rm -f /tmp/bahram-complete-build.done; nohup bash /tmp/bahram-complete-build.sh; echo $? > /tmp/bahram-complete-build.done")

for i in range(100):
    time.sleep(15)
    _, out, _ = c.exec_command(
        "test -f /tmp/bahram-complete-build.done && cat /tmp/bahram-complete-build.done || echo running",
        timeout=10,
    )
    status = out.read().decode().strip()
    if status != "running":
        print(f"Finished exit={status}")
        break
    if i % 2 == 0:
        _, tail, _ = c.exec_command("tail -3 /tmp/bahram-complete-build.log 2>/dev/null", timeout=10)
        t = tail.read().decode("utf-8", "replace").strip()
        if t:
            print("...", t.split("\n")[-1][:120])
else:
    print("Still running after timeout — tail log:")

_, log_out, _ = c.exec_command("tail -60 /tmp/bahram-complete-build.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
