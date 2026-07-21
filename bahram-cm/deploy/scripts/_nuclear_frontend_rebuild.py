"""Nuclear fix: rm node_modules, fresh npm ci, build, pm2 start."""
import time

from _deploy_common import app_root, configure_stdout, connect, load_deploy_env

configure_stdout()
APP = app_root(load_deploy_env())

remote = f"""#!/bin/bash
set -e
LOG=/tmp/bahram-fe-nuclear.log
: > "$LOG"
echo START >> "$LOG"

pm2 stop all 2>/dev/null || true
sleep 2
pkill -9 -f node 2>/dev/null || true
sleep 3

cd {APP}/frontend
rm -rf node_modules .next
if ! swapon --show | grep -q swapfile; then swapon /swapfile 2>/dev/null || true; fi
free -h >> "$LOG"

export NODE_OPTIONS="--max-old-space-size=2560"
unset NODE_ENV
npm ci >> "$LOG" 2>&1
export NODE_ENV=production
node scripts/generate-version.mjs >> "$LOG" 2>&1
npx next build >> "$LOG" 2>&1
test -f .next/BUILD_ID && echo BUILD_OK >> "$LOG" || {{ echo BUILD_FAIL >> "$LOG"; exit 1; }}

pm2 start {APP}/deploy/pm2/ecosystem.config.cjs >> "$LOG" 2>&1
sleep 8
curl -sf -o /dev/null -w 'NEXT:%{{http_code}}\\n' http://127.0.0.1:3000/ >> "$LOG" 2>&1 || echo NEXT_FAIL >> "$LOG"
curl -sf -o /dev/null -w 'LARAVEL:%{{http_code}}\\n' http://127.0.0.1:8010/up >> "$LOG" 2>&1 || echo LARAVEL_FAIL >> "$LOG"
pm2 list >> "$LOG" 2>&1
echo DONE >> "$LOG"
"""

c = connect(load_deploy_env(), timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-fe-nuclear.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-fe-nuclear.sh", 0o755)
sftp.close()

print("Nuclear frontend rebuild (stop all node, fresh install)...")
c.exec_command("rm -f /tmp/bahram-fe-nuclear.done; nohup bash /tmp/bahram-fe-nuclear.sh; echo $? > /tmp/bahram-fe-nuclear.done")

for i in range(120):
    time.sleep(15)
    _, out, _ = c.exec_command("test -f /tmp/bahram-fe-nuclear.done && cat /tmp/bahram-fe-nuclear.done || echo running", timeout=10)
    st = out.read().decode().strip()
    if st != "running":
        print(f"exit={st}")
        break
    if i % 2 == 0:
        _, tail, _ = c.exec_command("tail -1 /tmp/bahram-fe-nuclear.log 2>/dev/null", timeout=10)
        t = tail.read().decode().strip()
        if t:
            print("...", t[:100])

_, log_out, _ = c.exec_command("tail -30 /tmp/bahram-fe-nuclear.log", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
