#!/usr/bin/env python3
"""Upload .next tarball in 100MB chunks (resumable) and extract on server."""
from __future__ import annotations

import io
import sys
import tempfile
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CHUNK_BYTES = 100 * 1024 * 1024

env: dict[str, str] = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
archive = Path(tempfile.gettempdir()) / "bahram-next.tgz"
if not archive.is_file():
    print(f"Missing {archive}")
    sys.exit(1)

data = archive.read_bytes()
parts = [data[i : i + CHUNK_BYTES] for i in range(0, len(data), CHUNK_BYTES)]
print(f"Uploading {len(data) / (1024*1024):.0f} MB in {len(parts)} chunks")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = client.open_sftp()

for idx, chunk in enumerate(parts):
    remote = f"/tmp/bahram-next.part{idx:02d}"
    print(f"chunk {idx + 1}/{len(parts)} ({len(chunk) / (1024*1024):.0f} MB)...", flush=True)
    with sftp.file(remote, "wb") as handle:
        handle.write(chunk)
    print(f"  ok", flush=True)

sftp.close()

remote_script = f"""#!/bin/bash
set -eo pipefail
APP={APP}
cd /tmp
cat bahram-next.part* > bahram-next-full.tgz
cd "$APP/frontend"
pm2 stop bahram-frontend 2>/dev/null || true
rm -rf .next
tar -xzf /tmp/bahram-next-full.tgz -C .
test -f .next/BUILD_ID
echo BUILD_ID=$(cat .next/BUILD_ID)
pm2 start "$APP/deploy/pm2/ecosystem.config.cjs" --only bahram-frontend --update-env
sleep 4
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/
rm -f /tmp/bahram-next.part* /tmp/bahram-next-full.tgz
echo DONE
"""

sftp = client.open_sftp()
with sftp.file("/tmp/assemble-next.sh", "w") as handle:
    handle.write(remote_script)
sftp.chmod("/tmp/assemble-next.sh", 0o755)
sftp.close()

print("Assembling and restarting...")
_, stdout, _ = client.exec_command("bash /tmp/assemble-next.sh 2>&1", timeout=600)
print(stdout.read().decode("utf-8", errors="replace"))
client.close()
