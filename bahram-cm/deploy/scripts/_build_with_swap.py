import io, sys, time
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")

remote = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/family-build2.log
exec > >(tee "$LOG") 2>&1
APP={APP}
swapoff /swapfile 2>/dev/null || true
rm -f /swapfile
fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
free -h
export NODE_OPTIONS="--max-old-space-size=2048"
cd $APP/frontend
unset NODE_ENV
npm install --no-audit --no-fund
export NODE_ENV=production
npm run build 2>&1
test -f .next/BUILD_ID
pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/family-build2.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/family-build2.sh", 0o755)
sftp.close()
_, stdout, stderr = c.exec_command("bash /tmp/family-build2.sh", timeout=3600)
print(stdout.read().decode("utf-8", "replace"))
err = stderr.read().decode("utf-8", "replace")
if err.strip():
    print("STDERR:", err)
c.close()
