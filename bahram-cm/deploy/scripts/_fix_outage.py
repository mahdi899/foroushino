from _deploy_common import app_root, backend_root, configure_stdout, connect, load_deploy_env

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

cmds = f"""
echo '=== CHUNK CHECK ==='
BUILD=$(cat {APP}/frontend/.next/BUILD_ID)
echo "BUILD_ID=$BUILD"
curl -sk -o /dev/null -w 'chunk:%{http_code}\n' --max-time 10 "https://rostami.app/_next/static/chunks/0k6c9i47ki3cm.js"
curl -sk -o /dev/null -w 'chunk_club:%{http_code}\n' --max-time 10 "https://rostami.club/_next/static/chunks/0k6c9i47ki3cm.js"

echo '=== ICON ROUTE (favicon error) ==='
curl -sk -o /dev/null -w 'icon:%{http_code}\n' --max-time 10 https://rostami.app/icon
curl -sk -o /dev/null -w 'icon_club:%{http_code}\n' --max-time 10 https://rostami.club/icon
ls -la {BE}/storage/app/public/media/site/logo-bahram.webp 2>&1

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

c = connect(env)
_, out, err = c.exec_command(cmds, timeout=120)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()
