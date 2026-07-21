"""Upload frontend proxy/middleware fixes + rebuild."""
import time

from _deploy_common import ROOT, app_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
APP = app_root(env)

uploads = [
    "frontend/middleware.ts",
    "frontend/lib/backend-proxy.ts",
    "frontend/lib/cache/cdnHeaders.ts",
    "frontend/lib/cache/middlewarePerf.ts",
]
files = [(ROOT / rel, rel) for rel in uploads if (ROOT / rel).is_file()]

c = connect(env, timeout=120)
print(f"Uploading {len(files)} frontend files...")
upload_files(c, files, env)

remote = f"""#!/bin/bash
set -e
LOG=/tmp/bahram-fe-fix.log
: > "$LOG"
pm2 stop bahram-frontend 2>/dev/null || true
pkill -9 -f 'next build' 2>/dev/null || true
rm -rf {APP}/frontend/.next
if ! swapon --show | grep -q swapfile; then swapon /swapfile 2>/dev/null || true; fi
export NODE_OPTIONS="--max-old-space-size=2560"
cd {APP}/frontend
npm ci >> "$LOG" 2>&1
export NODE_ENV=production
node scripts/generate-version.mjs >> "$LOG" 2>&1
npx next build >> "$LOG" 2>&1
test -f .next/BUILD_ID && echo BUILD_OK >> "$LOG"
pm2 start {APP}/deploy/pm2/ecosystem.config.cjs --only bahram-frontend >> "$LOG" 2>&1 || pm2 restart bahram-frontend >> "$LOG" 2>&1
sleep 6
curl -sf -o /dev/null -w 'NEXT:%{{http_code}}\\n' http://127.0.0.1:3000/ >> "$LOG" 2>&1 || echo NEXT_FAIL >> "$LOG"
echo DONE >> "$LOG"
"""

sftp = c.open_sftp()
with sftp.file("/tmp/bahram-fe-fix.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/bahram-fe-fix.sh", 0o755)
sftp.close()

c.exec_command("rm -f /tmp/bahram-fe-fix.done; nohup bash /tmp/bahram-fe-fix.sh; echo $? > /tmp/bahram-fe-fix.done")

for i in range(120):
    time.sleep(15)
    _, out, _ = c.exec_command("test -f /tmp/bahram-fe-fix.done && cat /tmp/bahram-fe-fix.done || echo running", timeout=10)
    if out.read().decode().strip() != "running":
        break
    if i % 2 == 0:
        _, tail, _ = c.exec_command("tail -1 /tmp/bahram-fe-fix.log 2>/dev/null", timeout=10)
        t = tail.read().decode().strip()
        if t:
            print("...", t[:100])

_, log_out, _ = c.exec_command("tail -20 /tmp/bahram-fe-fix.log; pm2 list | head -8", timeout=30)
print(log_out.read().decode("utf-8", "replace"))
c.close()
