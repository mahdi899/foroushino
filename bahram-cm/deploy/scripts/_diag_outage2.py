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
echo '=== PM2 DESCRIBE ==='
pm2 describe bahram-frontend 2>&1 | head -40

echo '=== PM2 RESTART LOG ==='
grep -E 'restart|exit|error|Error|killed|OOM' /var/log/pm2/bahram-frontend-error.log 2>/dev/null | tail -30

echo '=== ECOSYSTEM PATH ==='
cat /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs 2>/dev/null | head -40

echo '=== SYMLINKS ==='
ls -la /var/www/bahram-cm 2>/dev/null | head -5
ls -la /var/www/foroushino/bahram-cm/frontend/.next/BUILD_ID 2>/dev/null
ls -la /var/www/bahram-cm/frontend/.next/BUILD_ID 2>/dev/null

echo '=== PAGE CONTENT CHECK ==='
curl -sk --max-time 15 https://rostami.app/ | head -c 800
echo ''
echo '---'
curl -sk --max-time 15 https://rostami.club/ | head -c 800
echo ''
echo '---'
curl -sk --max-time 15 https://rostami.app/_next/static/chunks/webpack.js 2>&1 | head -c 200
echo ''

echo '=== RSC POST TEST ==='
curl -sk --max-time 15 -X POST https://rostami.club/ -H 'Content-Type: text/plain;charset=UTF-8' -H 'Next-Router-State-Tree: %5B%22%22%5D' -d '[]' -w '\nHTTP:%{http_code}\n' | tail -5

echo '=== BACKEND API SAMPLE ==='
curl -sk --max-time 10 https://rostami.app/api/v1/family/branding | head -c 300
echo ''

echo '=== PHP-FPM SOCKET ==='
ls -la /run/php/php8.4-fpm.sock 2>/dev/null || ls -la /run/php/*.sock 2>/dev/null

echo '=== RECENT PM2 OUT ==='
tail -30 /var/log/pm2/bahram-frontend-out.log 2>/dev/null
"""

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(env["DEPLOY_HOST"], 22, env["DEPLOY_USER"], env["DEPLOY_PASSWORD"], timeout=120)
_, out, _ = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
c.close()
