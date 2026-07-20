#!/usr/bin/env bash
# Build Flutter Family Manager for production (rostami.club/admin/)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/foroushino/bahram-family-manager}"
FLUTTER_BIN="${FLUTTER_BIN:-${APP_DIR}/../.tools/flutter/bin/flutter}"
API_BASE_URL="${API_BASE_URL:-https://rostami.club/api/v1}"

cd "$APP_DIR"

if [[ ! -x "$FLUTTER_BIN" ]]; then
  echo "ERROR: Flutter not found at $FLUTTER_BIN"
  echo "Install Flutter or set FLUTTER_BIN=/path/to/flutter"
  exit 1
fi

echo "==> flutter pub get"
"$FLUTTER_BIN" pub get

echo "==> flutter build web (base-href=/admin/)"
"$FLUTTER_BIN" build web \
  --release \
  --base-href=/admin/ \
  --dart-define="API_BASE_URL=${API_BASE_URL}"

echo "==> Build complete: ${APP_DIR}/build/web"
