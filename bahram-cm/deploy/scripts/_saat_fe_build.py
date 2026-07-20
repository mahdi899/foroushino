#!/usr/bin/env python3
from pathlib import Path
import paramiko

ROOT = Path(__file__).resolve().parents[3]
env = {}
for line in (ROOT / "saat" / "deploy" / "deploy.env").read_text(encoding="utf-8").splitlines():
    if line.strip() and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

script = r"""#!/bin/bash
set -euo pipefail
cd /var/www/saat/frontend
npm ci
VITE_UPDATE_TYPE=optional npm run build
cp -f public/version.json dist/version.json
echo "BUILD:"
cat dist/version.json
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/saat-fe-build.sh", "w") as f:
    f.write(script)
sftp.chmod("/tmp/saat-fe-build.sh", 0o755)
sftp.close()
print("Building frontend...")
_, o, e = c.exec_command("bash /tmp/saat-fe-build.sh 2>&1", timeout=600)
print(o.read().decode("utf-8", errors="replace")[-4000:])
c.close()
