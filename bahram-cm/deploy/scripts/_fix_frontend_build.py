#!/usr/bin/env python3
import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")

remote = f"""#!/bin/bash
set -eo pipefail
LOG=/tmp/family-build-fix.log
exec > >(tee "$LOG") 2>&1
APP={APP}

swapon /swapfile 2>/dev/null || true
free -h

cd "$APP/frontend"
export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
unset NODE_ENV

echo "==> npm ci"
npm ci --no-audit --no-fund

export NODE_ENV=production
echo "==> next build"
npx next build --webpack

echo BUILD_ID=$(cat .next/BUILD_ID)
pm2 start "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env \
  || pm2 reload "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/ || true
echo DONE
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = client.open_sftp()
with sftp.file("/tmp/family-build-fix.sh", "w") as handle:
    handle.write(remote)
sftp.chmod("/tmp/family-build-fix.sh", 0o755)
sftp.close()

client.exec_command(
    "rm -f /tmp/family-build-fix.done; "
    "nohup bash /tmp/family-build-fix.sh; "
    "echo $? > /tmp/family-build-fix.done",
    timeout=30,
)
print("Full frontend rebuild started on", env["DEPLOY_HOST"])

import time

for i in range(90):
    time.sleep(20)
    _, stdout, _ = client.exec_command(
        "test -f /tmp/family-build-fix.done && echo FIN || echo RUN; "
        "tail -1 /tmp/family-build-fix.log 2>/dev/null",
        timeout=60,
    )
    lines = stdout.read().decode().strip().split("\n")
    status = lines[0] if lines else "?"
    tail = lines[-1] if len(lines) > 1 else ""
    print(f"[{i * 20:4d}s] {status} | {tail[-120:]}")

    if status == "FIN":
        _, stdout, _ = client.exec_command(
            "cat /tmp/family-build-fix.done; tail -50 /tmp/family-build-fix.log",
            timeout=120,
        )
        print(stdout.read().decode("utf-8", errors="replace"))
        break
else:
    print("TIMEOUT")
    _, stdout, _ = client.exec_command("tail -50 /tmp/family-build-fix.log", timeout=60)
    print(stdout.read().decode("utf-8", errors="replace"))

client.close()
