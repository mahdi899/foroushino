#!/usr/bin/env bash
set -euo pipefail

cd /var/www/foroushino
git checkout -- bahram-cm/frontend/lib/pwa/build-info.generated.ts bahram-cm/frontend/public/version.json bahram-cm/backend/database/data/media_library.json 2>/dev/null || true

echo "before=$(git rev-parse --short HEAD)"
ls -lh /tmp/foroushino-deploy.bundle /tmp/publish-family-wallpapers.php

if ! git pull --ff-only /tmp/foroushino-deploy.bundle HEAD; then
  echo "bundle pull failed — trying origin"
  git pull --ff-only origin main
fi
rm -f /tmp/foroushino-deploy.bundle
echo "after=$(git rev-parse --short HEAD)"

test -f bahram-cm/backend/storage/app/public/media/site/family-chat-wallpaper-dark.webp
test -f bahram-cm/backend/storage/app/public/media/site/family-chat-wallpaper-light.webp

cd /var/www/bahram-cm/backend
php /tmp/publish-family-wallpapers.php
php artisan media:sync --import || true

cd /var/www/bahram-cm/frontend
unset NODE_ENV
export NODE_OPTIONS=--max-old-space-size=3072
npm run build
pm2 reload /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs --update-env

echo "=== VERIFY ==="
curl -s -o /dev/null -w "dark=%{http_code}:%{size_download}\n" \
  https://cdn.rostami.app/media/site/family-chat-wallpaper-dark.webp
curl -s -o /dev/null -w "light=%{http_code}:%{size_download}\n" \
  https://cdn.rostami.app/media/site/family-chat-wallpaper-light.webp
curl -s -o /dev/null -w "club_dark=%{http_code}:%{size_download}\n" \
  https://rostami.club/storage/media/site/family-chat-wallpaper-dark.webp
curl -s -o /dev/null -w "club_light=%{http_code}:%{size_download}\n" \
  https://rostami.club/storage/media/site/family-chat-wallpaper-light.webp
curl -s https://rostami.club/ | tr '"' '\n' | grep family-chat-wallpaper | head -10
echo DONE
