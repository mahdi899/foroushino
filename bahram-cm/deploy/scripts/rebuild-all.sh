#!/bin/bash
set -euo pipefail
LOG=/tmp/full_deploy_build.log
exec > >(tee -a "$LOG") 2>&1

echo "=== START $(date -Is) ==="

# Stop crash-loop while building
pm2 stop bahram-frontend || true
pkill -f 'next build' 2>/dev/null || true
pkill -f 'npm run build' 2>/dev/null || true
rm -f /var/www/foroushino/bahram-cm/frontend/.next/lock 2>/dev/null || true
sleep 2

echo "=== NEXT BUILD ==="
cd /var/www/foroushino/bahram-cm/frontend
npm run build
test -f .next/BUILD_ID
echo "NEXT_BUILD_ID=$(cat .next/BUILD_ID)"

pm2 restart bahram-frontend
sleep 3
curl -skI http://127.0.0.1:3000/family | head -3

echo "=== FLUTTER BUILD ==="
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export PATH="/var/www/foroushino/.tools/flutter/bin:$PATH"
APP_DIR=/var/www/foroushino/bahram-family-manager
cd "$APP_DIR"
flutter pub get
flutter build web --release --base-href=/admin/ --dart-define="API_BASE_URL=https://rostami.app/api/v1"
test -f build/web/index.html

pm2 restart family-manager-web
sleep 2
curl -skI https://127.0.0.1/admin/ -H 'Host: rostami.club' -k | head -3 || true

echo "=== DONE $(date -Is) ==="
