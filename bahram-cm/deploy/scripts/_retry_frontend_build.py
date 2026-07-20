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
set -euo pipefail
LOG=/tmp/family-build-retry.log
exec > >(tee "$LOG") 2>&1
APP={APP}

swapoff /swapfile 2>/dev/null || true
fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile >/dev/null 2>&1 || true
swapon /swapfile 2>/dev/null || true
free -h

pm2 stop bahram-frontend 2>/dev/null || true
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

cd "$APP/frontend"
rm -rf .next node_modules/.cache

export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
unset NODE_ENV
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
export NODE_ENV=production
npx next build --webpack 2>&1 || npx next build 2>&1

test -f .next/BUILD_ID
echo NEW_BUILD_ID=$(cat .next/BUILD_ID)
pm2 reload "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env
echo DONE
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = client.open_sftp()
with sftp.file("/tmp/family-build-retry.sh", "w") as handle:
    handle.write(remote)
sftp.chmod("/tmp/family-build-retry.sh", 0o755)
sftp.close()

client.exec_command(
    "rm -f /tmp/family-build-retry.done; "
    "nohup bash /tmp/family-build-retry.sh; "
    "echo $? > /tmp/family-build-retry.done",
    timeout=30,
)
print("Frontend rebuild started on", env["DEPLOY_HOST"])

import time

exit_code = 1
for i in range(60):
    time.sleep(20)
    _, stdout, _ = client.exec_command(
        "test -f /tmp/family-build-retry.done && echo FIN || echo RUN; "
        "tail -1 /tmp/family-build-retry.log 2>/dev/null",
        timeout=60,
    )
    lines = stdout.read().decode().strip().split("\n")
    status = lines[0] if lines else "?"
    tail = lines[-1] if len(lines) > 1 else ""
    print(f"[{i * 20:4d}s] {status} | {tail[-120:]}")

    if status == "FIN":
        _, stdout, _ = client.exec_command(
            "cat /tmp/family-build-retry.done; tail -40 /tmp/family-build-retry.log",
            timeout=120,
        )
        output = stdout.read().decode("utf-8", errors="replace")
        print(output)
        try:
            exit_code = int(output.splitlines()[0].strip())
        except (IndexError, ValueError):
            exit_code = 0 if "DONE" in output else 1
        break
else:
    print("TIMEOUT")
    _, stdout, _ = client.exec_command("tail -40 /tmp/family-build-retry.log", timeout=60)
    print(stdout.read().decode("utf-8", errors="replace"))

client.close()
sys.exit(exit_code)
