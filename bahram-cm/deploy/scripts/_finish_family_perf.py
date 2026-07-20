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
FLUTTER = "/var/www/foroushino/bahram-family-manager"

remote = f"""#!/bin/bash
set -euo pipefail
LOG=/tmp/family-perf-finish.log
exec > >(tee "$LOG") 2>&1
APP={APP}
FLUTTER={FLUTTER}
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=4096 2>/dev/null
  chmod 600 /swapfile
  mkswap /swapfile 2>/dev/null || true
  swapon /swapfile 2>/dev/null || true
fi
export NODE_OPTIONS="${{NODE_OPTIONS:---max-old-space-size=2560}}"
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
cd $APP/frontend
unset NODE_ENV
npm install --no-audit --no-fund
export NODE_ENV=production
npm run build
test -f .next/BUILD_ID
pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env
API_BASE_URL=https://rostami.club/api/v1 bash $FLUTTER/scripts/build-web-production.sh
pm2 restart family-manager-web
pm2 save
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK
curl -sf -o /dev/null -w "next:%{{http_code}}\\n" http://127.0.0.1:3000/
echo DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
sftp = c.open_sftp()
with sftp.file("/tmp/family-perf-finish.sh", "w") as f:
    f.write(remote)
sftp.chmod("/tmp/family-perf-finish.sh", 0o755)
sftp.close()
c.exec_command("rm -f /tmp/family-perf-finish.done; nohup bash /tmp/family-perf-finish.sh; echo $? > /tmp/family-perf-finish.done", timeout=30)
print("Build started...")
for i in range(120):
    time.sleep(30)
    _, out, _ = c.exec_command(
        "test -f /tmp/family-perf-finish.done && echo FIN || echo RUN; "
        "tail -3 /tmp/family-perf-finish.log 2>/dev/null; "
        "test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && echo HAS_BUILD || true",
        timeout=60,
    )
    lines = out.read().decode().strip().split("\n")
    print(f"[{(i+1)*30:4d}s] {lines[0] if lines else '?'} | {(lines[-1] if len(lines)>1 else '')[-120:]}")
    if lines and lines[0] == "FIN":
        _, out, _ = c.exec_command("cat /tmp/family-perf-finish.done; tail -60 /tmp/family-perf-finish.log", timeout=120)
        print(out.read().decode("utf-8", "replace"))
        break
else:
    _, out, _ = c.exec_command("tail -40 /tmp/family-perf-finish.log", timeout=60)
    print("TIMEOUT\n", out.read().decode("utf-8", "replace"))
c.close()
