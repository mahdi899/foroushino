#!/usr/bin/env python3
import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env = {}
for line in Path(__file__).resolve().parents[1].joinpath("deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

cmds = [
    "pm2 list | head -8",
    'curl -sf -o /dev/null -w "next:%{http_code}" http://127.0.0.1:3000/; echo',
    "test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && cat /var/www/bahram-cm/frontend/.next/BUILD_ID || echo NO_BUILD",
    "tail -40 /tmp/bahram-repair.log 2>/dev/null || echo NO_REPAIR_LOG",
    "ls -la /var/www/bahram-cm /var/www/foroushino/bahram-cm 2>/dev/null | head -5",
    "test -x /var/www/bahram-cm/frontend/node_modules/.bin/next && echo NEXT_BIN_OK || echo NEXT_BIN_MISSING",
    "pm2 logs bahram-frontend --lines 20 --nostream 2>&1 | tail -25",
    "grep -E 'FAMILY_MEDIA_CDN_URL|MEDIA_URL' /var/www/bahram-cm/backend/.env | head -5",
]
for cmd in cmds:
    print("===", cmd[:75], "===")
    _, o, e = c.exec_command(cmd, timeout=90)
    print(o.read().decode("utf-8", errors="replace"))
    err = e.read().decode("utf-8", errors="replace")
    if err.strip():
        print("ERR:", err)
c.close()
