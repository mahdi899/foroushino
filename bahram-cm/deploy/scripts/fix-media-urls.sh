#!/usr/bin/env bash
# Fix media URL linking after files moved to download host (FTP/CDN).
# Run on origin: bash deploy/scripts/fix-media-urls.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
ENV_FILE="${APP_ROOT}/backend/.env"
FE_ENV="${APP_ROOT}/frontend/.env.local"

echo "==> Updating backend .env"
set_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

set_env FAMILY_MEDIA_DISK family_media_ftp
set_env MEDIA_DISK site_media_ftp
grep -q '^FAMILY_MEDIA_CDN_URL=' "$ENV_FILE" || set_env FAMILY_MEDIA_CDN_URL https://cdn.rostami.app
grep -q '^MEDIA_URL=' "$ENV_FILE" || set_env MEDIA_URL https://cdn.rostami.app

echo "==> family_media disk column (public → family_media_ftp)"
mysql bahram_backend -e "
UPDATE family_media
SET disk = 'family_media_ftp'
WHERE disk IN ('public', 'local')
  AND storage_path IS NOT NULL
  AND storage_path != '';
SELECT disk, COUNT(*) AS c FROM family_media GROUP BY disk;
"

echo "==> Clear Laravel caches"
cd "${APP_ROOT}/backend"
php artisan config:clear
php artisan cache:clear
php artisan tinker --execute="
Illuminate\Support\Facades\Cache::forget('family:branding:public');
Illuminate\Support\Facades\Cache::forget('family.media_pipeline.config');
App\Support\MediaFtpConnection::forgetCachedConfig();
echo 'caches cleared';
"

echo "==> Purge local origin copies (canonical on download host)"
php artisan media:purge-local-copies --limit=500 || true

echo "==> Frontend CDN env (requires rebuild to bake into Next.js)"
if [ -f "$FE_ENV" ]; then
  if grep -q '^NEXT_PUBLIC_MEDIA_URL=' "$FE_ENV"; then
    sed -i 's|^NEXT_PUBLIC_MEDIA_URL=.*|NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app|' "$FE_ENV"
  else
    echo 'NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app' >> "$FE_ENV"
  fi
else
  echo 'NEXT_PUBLIC_MEDIA_URL=https://cdn.rostami.app' > "$FE_ENV"
fi

echo "==> Sample API check"
curl -sk https://rostami.app/api/v1/family/branding | head -c 400
echo
echo "Done. Rebuild frontend if NEXT_PUBLIC_MEDIA_URL changed: bash deploy/scripts/rebuild-frontend.sh bahram"
