#!/usr/bin/env python3
import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[2]
env = {}
for line in Path(__file__).resolve().parents[1].joinpath("deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

files = [
    ("frontend/middleware.ts", "/var/www/bahram-cm/frontend/middleware.ts"),
    ("frontend/lib/family/mediaPlaybackUrl.ts", "/var/www/bahram-cm/frontend/lib/family/mediaPlaybackUrl.ts"),
    ("backend/app/Console/Commands/RefreshFamilyDemo.php", "/var/www/bahram-cm/backend/app/Console/Commands/RefreshFamilyDemo.php"),
    ("deploy/nginx/snippets/download-host-media-inline.conf", "/var/www/bahram-cm/deploy/nginx/snippets/download-host-media-inline.conf"),
]

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
for local_rel, remote in files:
    sftp.put(str(ROOT / local_rel), remote)
    print("uploaded", local_rel)
sftp.close()

_, o, e = c.exec_command(
    "cd /var/www/bahram-cm/frontend && npm run build 2>&1 | tail -30 && pm2 reload bahram-frontend --update-env 2>&1",
    timeout=600,
)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err.strip():
    print("STDERR:", err)
c.close()
