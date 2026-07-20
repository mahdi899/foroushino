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
APP={APP}
cd "$APP/frontend"

swapon /swapfile 2>/dev/null || true
if ! swapon --show | grep -q /swapfile; then
  rm -f /swapfile 2>/dev/null || true
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 status=none
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
fi

free -h
export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
unset NODE_ENV

if [[ ! -d node_modules/next ]]; then
  npm install --no-audit --no-fund
fi

export NODE_ENV=production
if [[ ! -f .next/BUILD_ID ]]; then
  npx next build --webpack
fi

pm2 start "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env \
  || pm2 reload "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env

echo BUILD_ID=$(cat .next/BUILD_ID)
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/ || true
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = client.open_sftp()
with sftp.file("/tmp/emergency-frontend-build.sh", "w") as handle:
    handle.write(remote)
sftp.chmod("/tmp/emergency-frontend-build.sh", 0o755)
sftp.close()

print("Running emergency frontend rebuild (blocking)...")
_, stdout, stderr = client.exec_command("bash /tmp/emergency-frontend-build.sh", timeout=3600)
print(stdout.read().decode("utf-8", errors="replace"))
err = stderr.read().decode("utf-8", errors="replace")
if err.strip():
    print("STDERR:", err)
client.close()
