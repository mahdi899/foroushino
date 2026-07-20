#!/usr/bin/env python3
import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env_file = Path(__file__).resolve().parents[1] / "deploy.env"
env: dict[str, str] = {}
for line in env_file.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(
    env["DEPLOY_HOST"],
    int(env.get("DEPLOY_PORT", "22")),
    env["DEPLOY_USER"],
    env["DEPLOY_PASSWORD"],
    timeout=120,
    banner_timeout=120,
    auth_timeout=120,
)

cmds = [
    "pm2 logs bahram-frontend --lines 40 --nostream 2>&1 | tail -50",
    "ls -la /var/www/bahram-cm/frontend/.next/BUILD_ID 2>&1",
    "node -v; cd /var/www/bahram-cm/frontend && test -f package.json && head -5 package.json",
    "supervisorctl status 2>&1 | head -15",
]
for cmd in cmds:
    print("\n===", cmd[:80], "===")
    _, o, e = c.exec_command(cmd, timeout=90)
    print(o.read().decode("utf-8", "replace") + e.read().decode("utf-8", "replace"))
c.close()
