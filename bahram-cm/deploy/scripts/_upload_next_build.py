#!/usr/bin/env python3
import io
import os
import sys
import tempfile
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
archive = Path(tempfile.gettempdir()) / "bahram-next.tgz"
if not archive.is_file():
    print(f"Missing archive: {archive}")
    sys.exit(1)

size_mb = archive.stat().st_size / (1024 * 1024)
print(f"Uploading {archive} ({size_mb:.1f} MB)...")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

sftp = client.open_sftp()

def progress(transferred, total):
    if total:
        pct = transferred * 100 // total
        if transferred == total or pct % 10 == 0:
            print(f"  upload {pct}% ({transferred // (1024*1024)} / {total // (1024*1024)} MB)", flush=True)

sftp.put(str(archive), "/tmp/bahram-next.tgz", callback=progress)
sftp.close()
print("Upload complete. Extracting on server...")

remote = f"""#!/bin/bash
set -eo pipefail
APP={APP}
cd "$APP/frontend"
pm2 stop bahram-frontend 2>/dev/null || true
rm -rf .next
tar -xzf /tmp/bahram-next.tgz -C .
test -f .next/BUILD_ID
echo BUILD_ID=$(cat .next/BUILD_ID)
pm2 start "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env
sleep 5
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/ || echo NEXT_DOWN
curl -sk -o /dev/null -w 'club:%{{http_code}}\\n' -H 'Host: rostami.club' https://127.0.0.1/family || true
rm -f /tmp/bahram-next.tgz
echo DONE
"""

sftp = client.open_sftp()
with sftp.file("/tmp/upload-next.sh", "w") as handle:
    handle.write(remote)
sftp.chmod("/tmp/upload-next.sh", 0o755)
sftp.close()

_, stdout, _ = client.exec_command("bash /tmp/upload-next.sh 2>&1", timeout=600)
print(stdout.read().decode("utf-8", errors="replace"))
client.close()
