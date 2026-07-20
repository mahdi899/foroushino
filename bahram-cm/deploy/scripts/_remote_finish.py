#!/usr/bin/env python3
import io, sys
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\deploy.env").read_text(encoding="utf-8").splitlines():
    line=line.strip()
    if line and not line.startswith("#") and "=" in line:
        k,v=line.split("=",1); env[k.strip()]=v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")

script = f"""
set -e
export COMPOSER_ALLOW_SUPERUSER=1
APP={APP}
cd $APP/backend
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
echo ARTISAN_OK
cd $APP/frontend
npm ci
npm run build
test -f .next/BUILD_ID && echo BUILD_OK
pm2 reload $APP/deploy/pm2/ecosystem.config.cjs --update-env
pm2 save
sleep 8
supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler || true
curl -sf http://127.0.0.1:8010/up && echo LARAVEL_OK
curl -sf -o /dev/null -w "NEXT:%{{http_code}}" http://127.0.0.1:3000/
echo
php -v | head -1
pm2 list | head -10
echo ALL_DONE
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], int(env.get("DEPLOY_PORT","22")), env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
print("Running migrate + npm build + pm2 (10+ min)...")
_, o, e = c.exec_command(script, timeout=900)
out = o.read().decode("utf-8", errors="replace")
err = e.read().decode("utf-8", errors="replace")
print(out)
if err:
    print("STDERR:", err[-3000:])
c.close()
print("Exit check:", "ALL_DONE" in out)
