"""Kill stale next build, rebuild frontend, restart PM2."""
import time

from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

remote = f"""#!/bin/bash
set -e
LOG=/tmp/bahram-rebuild.log
: > "$LOG"
echo "=== REBUILD $(date -Is) ===" >> "$LOG"

pm2 stop bahram-frontend 2>/dev/null || true

pkill -9 -f 'next build' 2>/dev/null || true
pkill -9 -f 'next-server' 2>/dev/null || true
pkill -9 -f 'node.*next' 2>/dev/null || true
sleep 2
rm -rf {APP}/frontend/.next

if ! swapon --show | grep -q swapfile; then
  swapon /swapfile 2>/dev/null || true
fi

export NODE_OPTIONS="--max-old-space-size=2560"
cd {APP}/frontend
unset NODE_ENV
npm ci >> "$LOG" 2>&1
export NODE_ENV=production
node scripts/generate-version.mjs >> "$LOG" 2>&1
npx next build >> "$LOG" 2>&1
test -f .next/BUILD_ID && echo BUILD_OK >> "$LOG"

pm2 delete bahram-frontend 2>/dev/null || true
pm2 start {APP}/deploy/pm2/ecosystem.config.cjs --only bahram-frontend >> "$LOG" 2>&1
sleep 5
curl -sf -o /dev/null -w 'NEXT:%{{http_code}}\\n' http://127.0.0.1:3000/ >> "$LOG" 2>&1 || echo NEXT_FAIL >> "$LOG"
pm2 list >> "$LOG" 2>&1
echo DONE >> "$LOG"
"""

c = connect(env, timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-rebuild.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-rebuild.sh", 0o755)
sftp.close()

print("Rebuilding frontend (clean)...")
c.exec_command("rm -f /tmp/bahram-rebuild.done; nohup bash /tmp/bahram-rebuild.sh; echo $? > /tmp/bahram-rebuild.done")

for i in range(120):
    time.sleep(15)
    _, out, _ = c.exec_command("test -f /tmp/bahram-rebuild.done && cat /tmp/bahram-rebuild.done || echo running", timeout=10)
    if out.read().decode().strip() != "running":
        break
    if i % 2 == 0:
        _, tail, _ = c.exec_command("tail -1 /tmp/bahram-rebuild.log 2>/dev/null", timeout=10)
        t = tail.read().decode().strip()
        if t:
            print("...", t[:100])

_, log_out, _ = c.exec_command("tail -25 /tmp/bahram-rebuild.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
