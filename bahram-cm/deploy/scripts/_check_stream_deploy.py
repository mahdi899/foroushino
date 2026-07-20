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

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

cmds = [
    "cd /var/www/foroushino && git log -1 --oneline",
    "grep -n 'requireMembership' /var/www/foroushino/bahram-cm/backend/app/Services/Family/FamilyMediaStreamService.php | head -2",
    "test -f /var/www/bahram-cm/frontend/app/api/family/media/\\[id\\]/stream/route.ts && echo ROUTE_SRC=ok || echo ROUTE_SRC=missing",
    "find /var/www/bahram-cm/frontend/.next/server/app/api/family -maxdepth 4 -type f 2>/dev/null | head -5 || echo NEXT_ROUTE=missing",
    "curl -sf -o /dev/null -w 'laravel_up:%{http_code}\\n' http://127.0.0.1:8010/up",
    "tail -5 /tmp/bahram-deploy-backup.log 2>/dev/null || true",
    "tail -20 /tmp/family-build2.log 2>/dev/null || true",
]

for cmd in cmds:
    print(f"=== {cmd}")
    _, stdout, _ = client.exec_command(cmd, timeout=60)
    print(stdout.read().decode("utf-8", errors="replace"))

client.close()
