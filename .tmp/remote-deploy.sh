#!/usr/bin/env bash
set -euo pipefail

echo "=== PRE-DEPLOY $(date -Is) ==="
cd /var/www/foroushino
echo "server_before=$(git rev-parse --short HEAD)"

# Drop leftover local edits that block ff-only pull
git checkout -- bahram-cm/frontend/lib/pwa/build-info.generated.ts bahram-cm/frontend/public/version.json 2>/dev/null || true
git checkout -- bahram-cm/backend/storage/app/public/media 2>/dev/null || true
git checkout -- \
  bahram-cm/backend/app/Services/ChatbotService.php \
  bahram-cm/frontend/app/admin/\(panel\)/settings/CaptchaProviderTest.tsx \
  bahram-cm/frontend/components/chatbot/FloatingChatbot.tsx \
  bahram-cm/frontend/lib/chatbot/quickSuggestions.ts \
  2>/dev/null || true

echo "==> pull from local bundle (GitHub unreachable from server)"
ls -lh /tmp/foroushino-deploy.bundle
git pull --ff-only /tmp/foroushino-deploy.bundle HEAD
echo "server_after=$(git rev-parse --short HEAD)"
rm -f /tmp/foroushino-deploy.bundle

echo "==> deploy.sh (migrate + build + pm2)"
bash /var/www/bahram-cm/deploy/scripts/deploy.sh

echo "==> media sync (family wallpaper)"
cd /var/www/bahram-cm/backend
php artisan storage:link 2>/dev/null || true
php artisan media:sync --import 2>/dev/null || true
php artisan media:sync --export 2>/dev/null || true

echo "==> smoke"
curl -sf http://127.0.0.1:8010/up && echo " Laravel OK"
curl -sf -o /dev/null -w "Next.js: %{http_code}\n" http://127.0.0.1:3000/
curl -sf -o /dev/null -w "wallpaper: %{http_code} size=%{size_download}\n" \
  http://127.0.0.1:8010/storage/media/site/family-chat-wallpaper.webp
test -f /var/www/bahram-cm/frontend/components/family/FamilyFeedWallpaper.tsx && echo "wallpaper_component=yes"

echo "=== DEPLOY DONE $(date -Is) ==="
