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
    "ls -lh /tmp/bahram-next.tgz 2>/dev/null || echo NO_TGZ",
    "du -sh /var/www/bahram-cm/frontend/.next 2>/dev/null || echo NO_NEXT",
    "free -h",
]
for cmd in cmds:
    print("===", cmd)
    _, o, _ = client.exec_command(cmd, timeout=60)
    print(o.read().decode("utf-8", "replace"))
client.close()
