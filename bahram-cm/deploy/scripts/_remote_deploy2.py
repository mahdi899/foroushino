#!/usr/bin/env python3
import io, sys, time
from pathlib import Path
import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
env = {}
for line in Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\deploy.env").read_text(encoding="utf-8").splitlines():
    line=line.strip()
    if line and not line.startswith("#") and "=" in line:
        k,v=line.split("=",1); env[k.strip()]=v.strip()

APP = env.get("DEPLOY_APP_ROOT", "/var/www/bahram-cm")

REMOTE = f"""#!/bin/bash
set -euo pipefail
APP={APP}
LOG=/tmp/bahram-prod-deploy2.log
exec > >(tee "$LOG") 2>&1
echo "=== DEPLOY STEPS 2-7 $(date -Is) ==="

systemctl enable --now php8.4-fpm

echo "==> nginx php8.4 socket"
sed -i 's|php8.3-fpm.sock|php8.4-fpm.sock|g' /etc/nginx/conf.d/rostami-upstreams.conf
php-fpm8.4 -t
nginx -t
systemctl restart php8.4-fpm
systemctl reload nginx

echo "==> composer"
cd "$APP/backend"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist
php artisan migrate --force
php artisan storage:link 2>/dev/null || true
php artisan config:cache && php artisan route:cache && php artisan view:cache && php artisan event:cache

echo "==> frontend build"
cd "$APP/frontend"
npm ci || npm install --no-audit --no-fund
npm run build
test -f .next/BUILD_ID && echo BUILD_OK

echo "==> pm2"
pm2 reload "$APP/deploy/pm2/ecosystem.config.cjs" --update-env
pm2 save
sleep 10

echo "==> supervisor"
supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler

echo "==> health"
curl -sf http://127.0.0.1:8010/up && echo OK_LARAVEL
curl -sf -o /dev/null -w "%{{http_code}}" http://127.0.0.1:3000/
echo
php -v | head -1
pm2 list | head -8

echo "=== DONE $(date -Is) ==="
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], int(env.get("DEPLOY_PORT","22")), env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)

# upload nginx upstream again
sftp = c.open_sftp()
sftp.put(str(Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\deploy\nginx\conf.d\rostami-upstreams.conf")), "/etc/nginx/conf.d/rostami-upstreams.conf")
sftp.put(str(Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\backend\composer.json")), f"{APP}/backend/composer.json")
sftp.put(str(Path(r"c:\Users\Msi\Desktop\foroushino\bahram-cm\backend\composer.lock")), f"{APP}/backend/composer.lock")
with sftp.file("/tmp/bahram-prod-deploy2.sh", "w") as f:
    f.write(REMOTE)
sftp.chmod("/tmp/bahram-prod-deploy2.sh", 0o755)
sftp.close()

c.exec_command("rm -f /tmp/bahram-prod-deploy2.done; nohup bash /tmp/bahram-prod-deploy2.sh; echo $? > /tmp/bahram-prod-deploy2.done", timeout=30)
print("Deploy running...")

for i in range(100):
    time.sleep(20)
    _, o, _ = c.exec_command("test -f /tmp/bahram-prod-deploy2.done && echo FIN || echo RUN; tail -3 /tmp/bahram-prod-deploy2.log 2>/dev/null", timeout=60)
    out = o.read().decode().strip().split("\n")
    print(f"[{i*20:4d}s] {out[0] if out else '?'} | {(out[-1] if len(out)>1 else '')[-100:]}")
    if out and out[0] == "FIN":
        _, o2, _ = c.exec_command("cat /tmp/bahram-prod-deploy2.done; tail -80 /tmp/bahram-prod-deploy2.log", timeout=120)
        print(o2.read().decode())
        code = int(o2.read().decode() or "1")
        _, o3, _ = c.exec_command("cat /tmp/bahram-prod-deploy2.done", timeout=10)
        try:
            code = int(o3.read().decode().strip())
        except ValueError:
            code = 1
        c.close()
        raise SystemExit(0 if code == 0 else 1)

print("TIMEOUT")
c.close()
raise SystemExit(1)
