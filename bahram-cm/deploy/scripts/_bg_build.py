#!/usr/bin/env python3
import io, sys, time
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(__file__).resolve().parents[1].joinpath("deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
app = "/var/www/bahram-cm"
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
script = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/bahram-next-build.log
exec > >(tee "$LOG") 2>&1
APP={app}
export NODE_OPTIONS="--max-old-space-size=2560"
cd $APP/frontend
export NODE_ENV=production
npm run build
test -f .next/BUILD_ID
pm2 start $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env || pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env
echo BUILD_OK
"""
sftp = c.open_sftp()
with sftp.file("/tmp/bahram-next-build.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/bahram-next-build.sh", 0o755)
sftp.close()
c.exec_command("rm -f /tmp/bahram-next-build.done; nohup bash /tmp/bahram-next-build.sh; echo $? > /tmp/bahram-next-build.done", timeout=30)
print("Build started in background...")
for i in range(40):
    time.sleep(15)
    _, o, _ = c.exec_command("test -f /tmp/bahram-next-build.done && cat /tmp/bahram-next-build.done || echo running", timeout=20)
    status = o.read().decode().strip()
    _, o2, _ = c.exec_command("tail -5 /tmp/bahram-next-build.log 2>/dev/null", timeout=20)
    tail = o2.read().decode("utf-8", errors="replace").strip()
    print(f"[{i+1}] status={status} | {tail[-120:]}")
    if status in ("0", "1"):
        break
_, o, _ = c.exec_command("tail -40 /tmp/bahram-next-build.log; pm2 list; curl -sf -o /dev/null -w 'next:%{http_code}\\n' http://127.0.0.1:3000/ || true", timeout=60)
print(o.read().decode("utf-8", errors="replace"))
c.close()
