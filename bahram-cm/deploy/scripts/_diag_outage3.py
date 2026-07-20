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
echo '=== DEV MODE FLAG ==='
ls -la /var/www/.bahram-dev-mode 2>&1

echo '=== RECENT NGINX ERRORS (last hour) ==='
grep "$(date +%Y/%m/%d)" /var/log/nginx/error.log 2>/dev/null | tail -20

echo '=== API ENDPOINTS ==='
for u in \
  'https://rostami.app/api/v1/family/branding' \
  'https://rostami.club/api/v1/family/branding' \
  'https://rostami.app/api/v1/family/feed?limit=3' \
  'https://rostami.club/api/v1/family/feed?limit=3' \
  'https://rostami.app/api/v1/articles?limit=1' \
  ; do
  code=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 "$u")
  echo "$u -> $code"
done

echo '=== FRONTEND BUILD VALIDITY ==='
test -f /var/www/bahram-cm/frontend/.next/BUILD_ID && echo 'BUILD_ID ok' || echo 'BUILD_ID MISSING'
test -d /var/www/bahram-cm/frontend/.next/static/chunks && echo 'chunks dir ok' || echo 'chunks MISSING'
ls /var/www/bahram-cm/frontend/.next/static/chunks/*.js 2>/dev/null | wc -l

echo '=== PM2 ERROR COUNT TODAY ==='
grep "$(date +%Y-%m-%d)" /var/log/pm2/bahram-frontend-error.log 2>/dev/null | grep -c 'Error' || echo 0

echo '=== REDIS ==='
redis-cli ping 2>&1

echo '=== PHP-FPM STATUS ==='
systemctl status php8.4-fpm --no-pager 2>&1 | head -8

echo '=== CHECK IF NEXT CRASHING ==='
sleep 5
pm2 jlist 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print(x['name'], x['pm2_env']['status'], 'restarts', x['pm2_env']['restart_time']) for x in d]" 2>/dev/null || pm2 list
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, _ = c.exec_command(cmds, timeout=90)
print(out.read().decode("utf-8", "replace"))
c.close()
