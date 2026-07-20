import subprocess
import sys
from pathlib import Path

from _deploy_common import ROOT, app_root, backend_root, configure_stdout, connect, load_deploy_env, upload_files

configure_stdout()
env = load_deploy_env()
APP = app_root(env)
BE = backend_root(env)

sftp_files = [
    (ROOT / "deploy" / "pm2" / "next-prod.cjs", "deploy/pm2/next-prod.cjs"),
    (ROOT / "deploy" / "pm2" / "ecosystem.config.cjs", "deploy/pm2/ecosystem.config.cjs"),
]

c = connect(env, timeout=120)
upload_files(c, sftp_files, env)

cmds = f"""
set -e
APP={APP}
FE=$APP/frontend
BE=$APP/backend

echo '=== ENSURE PRODUCTION BUILD ==='
if [ ! -f "$FE/.next/BUILD_ID" ]; then
  echo 'BUILD MISSING — running npm run build'
  cd "$FE"
  export NODE_ENV=production NODE_OPTIONS='--max-old-space-size=3072'
  npm run build
fi

echo '=== FIX MISSING LOGO (favicon ENOENT) ==='
mkdir -p "$BE/storage/app/public/media/site"
if [ ! -f "$BE/storage/app/public/media/site/logo-bahram.webp" ]; then
  curl -sfL 'https://cdn.rostami.app/media/site/logo-bahram.webp' -o "$BE/storage/app/public/media/site/logo-bahram.webp" || true
  chown www-data:www-data "$BE/storage/app/public/media/site/logo-bahram.webp" 2>/dev/null || true
fi
ls -la "$BE/storage/app/public/media/site/logo-bahram.webp" 2>&1 || echo 'logo still missing (CDN fallback ok)'

echo '=== BACKEND CACHE CLEAR ==='
cd "$BE"
php artisan config:clear
php artisan cache:clear || true
php artisan route:clear || true
systemctl is-active php8.4-fpm && systemctl reload php8.4-fpm

echo '=== PM2 RESTART WITH STABLE WRAPPER ==='
pm2 delete bahram-frontend 2>/dev/null || true
pm2 start {APP}/deploy/pm2/ecosystem.config.cjs --only bahram-frontend --update-env
pm2 restart family-manager-web --update-env 2>/dev/null || true
pm2 save
systemctl reload nginx

echo '=== WAIT FOR READY ==='
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf --max-time 3 http://127.0.0.1:3000/ >/dev/null; then
    echo "next ready after ${{i}}s"
    break
  fi
  sleep 1
done

echo '=== HEALTH CHECK ==='
curl -sf -o /dev/null -w 'next:%{{http_code}}\\n' http://127.0.0.1:3000/
curl -sf -o /dev/null -w 'api:%{{http_code}}\\n' http://127.0.0.1:8010/api/v1/family/branding
curl -sk -o /dev/null -w 'app:%{{http_code}}\\n' https://rostami.app/
curl -sk -o /dev/null -w 'club:%{{http_code}}\\n' https://rostami.club/
curl -sk -o /dev/null -w 'feed:%{{http_code}}\\n' 'https://rostami.club/api/v1/family/feed?limit=1'

pm2 list
"""

_, out, err = c.exec_command(cmds, timeout=300)
print(out.read().decode("utf-8", "replace"))
e = err.read().decode("utf-8", "replace")
if e.strip():
    print("STDERR:", e)
c.close()

print("\n=== EXTERNAL PROBE ===")
subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "_probe_external.py")], check=False)
