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
APP={APP}
cd "$APP/frontend"
pm2 stop bahram-frontend 2>/dev/null || true
swapon /swapfile 2>/dev/null || true
free -h
export NODE_OPTIONS="--max-old-space-size=1536"
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production
echo START_WEBPACK_BUILD
npx next build --webpack
echo BUILD_EXIT=$?
test -f .next/BUILD_ID && echo BUILD_ID=$(cat .next/BUILD_ID) || echo NO_BUILD
pm2 start "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env
sleep 5
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/ || echo NEXT_DOWN
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = client.open_sftp()
with sftp.file("/tmp/webpack-build.sh", "w") as handle:
    handle.write(remote)
sftp.chmod("/tmp/webpack-build.sh", 0o755)
sftp.close()

print("Webpack build on server (blocking)...")
_, stdout, _ = client.exec_command("bash /tmp/webpack-build.sh 2>&1 | tee /tmp/webpack-build.log", timeout=3600)
out = stdout.read().decode("utf-8", errors="replace")
print(out[-15000:] if len(out) > 15000 else out)
client.close()
