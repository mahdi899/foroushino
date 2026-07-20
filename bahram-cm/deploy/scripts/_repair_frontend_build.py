#!/usr/bin/env python3
import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(__file__).resolve().parents[1].joinpath("deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
app = "/var/www/bahram-cm"
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
cmd = f"""bash -lc 'set -e
APP={app}
export NODE_OPTIONS="--max-old-space-size=3072"
cd $APP/frontend
pm2 delete bahram-frontend 2>/dev/null || true
rm -rf node_modules .next
unset NODE_ENV
npm ci
export NODE_ENV=production
npm run build
test -f .next/BUILD_ID
pm2 start $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env
sleep 6
pm2 list
curl -sf -o /dev/null -w "next:%{{http_code}}\\n" http://127.0.0.1:3000/
curl -sSI "https://rostami.club/media/family/demo/demo-video.mp4" | grep -i content-disposition
'"""
_, o, e = c.exec_command(cmd, timeout=900)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err.strip(): print("STDERR:", err)
c.close()
