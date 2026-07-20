"""Run frontend build on server — no process substitution (fixes SIGPIPE 141)."""
import time

from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

remote = f"""#!/bin/bash
set -e
LOG=/tmp/bahram-next-build.log
: > "$LOG"
echo "=== NEXT BUILD $(date -Is) ===" >> "$LOG"

if ! swapon --show | grep -q swapfile; then
  swapoff /swapfile 2>/dev/null || true
  rm -f /swapfile
  fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
fi
free -h >> "$LOG"

export NODE_OPTIONS="--max-old-space-size=2560"
cd {APP}/frontend
unset NODE_ENV
echo "npm ci..." >> "$LOG"
npm ci >> "$LOG" 2>&1
export NODE_ENV=production
echo "npm run build..." >> "$LOG"
npm run build >> "$LOG" 2>&1
test -f .next/BUILD_ID && echo BUILD_OK >> "$LOG" || {{ echo BUILD_FAIL >> "$LOG"; exit 1; }}

echo "PM2 reload..." >> "$LOG"
pm2 reload {APP}/deploy/pm2/ecosystem.config.cjs --update-env >> "$LOG" 2>&1 || pm2 start {APP}/deploy/pm2/ecosystem.config.cjs >> "$LOG" 2>&1

cd {BE}
supervisorctl restart bahram-horizon >> "$LOG" 2>&1 || true

php artisan tinker --execute="
\\$c = app(App\\\\Modules\\\\TelegramBot\\\\Clients\\\\TelegramBotClientFactory::class)->forBot(App\\\\Modules\\\\TelegramBot\\\\Models\\\\TelegramBot::where('key','production')->first());
\\$r = \\$c->sendMessage(5244383790, '🏗 بیلد کامل شد — '.date('H:i:s'));
echo 'msg_id='.(\\$r['message_id']??'?').PHP_EOL;
" >> "$LOG" 2>&1

curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK >> "$LOG" || echo LARAVEL_FAIL >> "$LOG"
curl -sf -o /dev/null -w "NEXT:%{{http_code}}\\n" http://127.0.0.1:3000/ >> "$LOG" 2>&1 || echo NEXT_FAIL >> "$LOG"
echo "=== DONE $(date -Is) ===" >> "$LOG"
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-next-build.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-next-build.sh", 0o755)
sftp.close()

print("Starting Next.js build (10-15 min)...")
c.exec_command("rm -f /tmp/bahram-next-build.done; nohup bash /tmp/bahram-next-build.sh; echo $? > /tmp/bahram-next-build.done")

for i in range(120):
    time.sleep(15)
    _, out, _ = c.exec_command(
        "test -f /tmp/bahram-next-build.done && cat /tmp/bahram-next-build.done || echo running",
        timeout=10,
    )
    status = out.read().decode().strip()
    if status != "running":
        print(f"Finished exit={status}")
        break
    if i % 2 == 0:
        _, tail, _ = c.exec_command("tail -1 /tmp/bahram-next-build.log 2>/dev/null", timeout=10)
        t = tail.read().decode("utf-8", "replace").strip()
        if t:
            print("...", t[:120])

_, log_out, _ = c.exec_command("tail -40 /tmp/bahram-next-build.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
