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
echo '=== EXTERNAL CURL ==='
for u in https://rostami.app/ https://rostami.club/ https://rostami.app/api/v1/family/branding; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "$u" 2>&1)
  echo "$u -> $code"
done

echo '=== LOCAL PORTS ==='
ss -tlnp 2>/dev/null | grep -E ':80|:443|:3000|:8010|:7358|:6379' || true

echo '=== PM2 ==='
pm2 list 2>&1

echo '=== NGINX ==='
systemctl is-active nginx 2>&1
nginx -t 2>&1 | tail -3

echo '=== PHP-FPM ==='
systemctl is-active php8.4-fpm 2>/dev/null || systemctl is-active php8.3-fpm 2>/dev/null || echo php-fpm-unknown

echo '=== LOCAL HEALTH ==='
curl -sf -o /dev/null -w 'next3000:%{http_code}\n' --max-time 5 http://127.0.0.1:3000/ 2>&1 || echo 'next3000:FAIL'
curl -sf -o /dev/null -w 'laravel8010:%{http_code}\n' --max-time 5 http://127.0.0.1:8010/api/v1/family/branding 2>&1 || echo 'laravel8010:FAIL'
curl -sf -o /dev/null -w 'nginx80:%{http_code}\n' --max-time 5 -H 'Host: rostami.app' http://127.0.0.1/ 2>&1 || echo 'nginx80:FAIL'

echo '=== PM2 LOGS bahram-frontend ==='
pm2 logs bahram-frontend --nostream --lines 20 2>&1 | tail -25

echo '=== NGINX ERROR (last 10) ==='
tail -10 /var/log/nginx/error.log 2>/dev/null || true

echo '=== DISK/MEM ==='
df -h / | tail -1
free -h | head -2
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, err = c.exec_command(cmds, timeout=90)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
