import io
import sys
from pathlib import Path

import paramiko

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

env = {}
for line in (Path(__file__).resolve().parents[1] / "deploy.env").read_text(encoding="utf-8").splitlines():
    if "=" in line and not line.strip().startswith("#"):
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip()

cmds = r"""
echo '=== CHUNK CHECK ==='
BUILD=$(cat /var/www/bahram-cm/frontend/.next/BUILD_ID)
echo "BUILD_ID=$BUILD"
curl -sk -o /dev/null -w 'chunk:%{http_code}\n' --max-time 10 "https://rostami.app/_next/static/chunks/0k6c9i47ki3cm.js"
curl -sk -o /dev/null -w 'chunk_club:%{http_code}\n' --max-time 10 "https://rostami.club/_next/static/chunks/0k6c9i47ki3cm.js"

echo '=== ICON ROUTE (favicon error) ==='
curl -sk -o /dev/null -w 'icon:%{http_code}\n' --max-time 10 https://rostami.app/icon
curl -sk -o /dev/null -w 'icon_club:%{http_code}\n' --max-time 10 https://rostami.club/icon
ls -la /var/www/foroushino/bahram-cm/backend/storage/app/public/media/site/logo-bahram.webp 2>&1

echo '=== LARAVEL DIRECT ==='
curl -sf --max-time 10 http://127.0.0.1:8010/api/v1/health 2>&1 || curl -sf --max-time 10 http://127.0.0.1:8010/up 2>&1 || echo 'no health route'
curl -sk -o /dev/null -w 'api_branding:%{http_code}\n' http://127.0.0.1:8010/api/v1/family/branding

echo '=== NGINX CONFIG TEST API ==='
grep -n '8010\|3000\|family-manager' /etc/nginx/sites-enabled/rostami-app.conf 2>/dev/null | head -20
grep -n '8010\|3000\|family-manager' /etc/nginx/sites-enabled/rostami-club.conf 2>/dev/null | head -20

echo '=== PM2 RESET RESTARTS + STABLE RESTART ==='
pm2 restart bahram-frontend --update-env
sleep 3
pm2 restart family-manager-web 2>/dev/null || true
systemctl reload nginx
sleep 2
curl -sf -o /dev/null -w 'after_fix next:%{http_code}\n' http://127.0.0.1:3000/
curl -sf -o /dev/null -w 'after_fix api:%{http_code}\n' http://127.0.0.1:8010/api/v1/family/branding
curl -sk -o /dev/null -w 'after_fix ext_app:%{http_code}\n' https://rostami.app/
curl -sk -o /dev/null -w 'after_fix ext_club:%{http_code}\n' https://rostami.club/
pm2 list
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
