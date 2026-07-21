#!/usr/bin/env python3
import io, sys
from pathlib import Path
import paramiko
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(__file__).resolve().parents[1].joinpath("deploy.env").read_text().splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1); env[k.strip()] = v.strip()
app = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
cmd = f"""bash -lc 'set -e; APP={app}; export NODE_OPTIONS="--max-old-space-size=3072"; cd $APP/frontend; unset NODE_ENV; npm ci; export NODE_ENV=production; npm run build 2>&1 | tail -20; test -f .next/BUILD_ID; pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env; sleep 4; curl -sf -o /dev/null -w "next:%{{http_code}}\\n" http://127.0.0.1:3000/'"""
_, o, e = c.exec_command(cmd, timeout=900)
print(o.read().decode("utf-8", errors="replace"))
err = e.read().decode("utf-8", errors="replace")
if err.strip(): print("STDERR:", err)
c.close()
