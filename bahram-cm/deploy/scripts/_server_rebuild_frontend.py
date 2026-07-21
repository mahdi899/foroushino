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
GIT = env.get("DEPLOY_GIT_ROOT", "/var/www/foroushino")

remote = f"""#!/bin/bash
set -eo pipefail
APP={APP}
GIT={GIT}

pm2 stop bahram-frontend 2>/dev/null || true
cd "$GIT" && git fetch origin main && git reset --hard origin/main

cd "$APP/frontend"
swapon /swapfile 2>/dev/null || true
free -h

export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
unset NODE_ENV
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

export NODE_ENV=production
npx next build --webpack

echo BUILD_ID=$(cat .next/BUILD_ID)
pm2 start "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env
sleep 4
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/
echo DONE
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = client.open_sftp()
with sftp.file("/tmp/rebuild-frontend.sh", "w") as handle:
    handle.write(remote)
sftp.chmod("/tmp/rebuild-frontend.sh", 0o755)
sftp.close()

client.exec_command(
    "rm -f /tmp/rebuild-frontend.done; "
    "nohup bash /tmp/rebuild-frontend.sh > /tmp/rebuild-frontend.log 2>&1; "
    "echo $? > /tmp/rebuild-frontend.done",
    timeout=30,
)
print("Server frontend rebuild started")

import time

for i in range(120):
    time.sleep(15)
    _, stdout, _ = client.exec_command(
        "test -f /tmp/rebuild-frontend.done && echo FIN || echo RUN; "
        "tail -1 /tmp/rebuild-frontend.log 2>/dev/null",
        timeout=60,
    )
    lines = stdout.read().decode().strip().split("\n")
    print(f"[{i * 15:4d}s] {lines[0] if lines else '?'} | {(lines[-1] if len(lines) > 1 else '')[-100:]}")

    if lines and lines[0] == "FIN":
        _, stdout, _ = client.exec_command(
            "cat /tmp/rebuild-frontend.done; tail -30 /tmp/rebuild-frontend.log",
            timeout=120,
        )
        print(stdout.read().decode("utf-8", errors="replace"))
        break

client.close()
