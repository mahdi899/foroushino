#!/usr/bin/env bash
# Saat — incremental update (only rebuild what changed)
# Usage: ./deploy/scripts/update.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/saat}"
GIT_ROOT="${GIT_ROOT:-/var/www/mini-call-center}"
BRANCH="${BRANCH:-main}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status()  { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

if [[ ! -d "$APP_DIR" ]]; then
  echo -e "${RED}App directory not found: $APP_DIR${NC}"
  exit 1
fi

REPO="$GIT_ROOT"
if [[ ! -d "$REPO/.git" ]]; then
  REPO="$APP_DIR"
fi

cd "$REPO"
print_status "Quick update started..."
git pull --ff-only origin "$BRANCH" || print_warning "git pull failed"

FRONTEND_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '^saat/frontend/' || true)
BACKEND_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '^saat/backend/' || true)

# If APP_DIR is a standalone checkout without saat/ prefix
if [[ -z "$FRONTEND_CHANGED" && -z "$BACKEND_CHANGED" ]]; then
  FRONTEND_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '^frontend/' || true)
  BACKEND_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '^backend/' || true)
fi

if [[ -n "$BACKEND_CHANGED" ]]; then
  print_status "Backend changes detected..."
  cd "$APP_DIR/backend"

  if echo "$BACKEND_CHANGED" | grep -q 'composer\.json\|composer\.lock'; then
    print_status "Installing PHP dependencies..."
    composer install --optimize-autoloader --no-dev --no-interaction
  fi

  if echo "$BACKEND_CHANGED" | grep -q 'database/migrations/'; then
    print_status "Running migrations..."
    php artisan migrate --force
  fi

  if echo "$BACKEND_CHANGED" | grep -qE 'config/|\.env'; then
    php artisan config:clear
    php artisan config:cache
  fi

  if echo "$BACKEND_CHANGED" | grep -q 'routes/'; then
    php artisan route:clear
    php artisan route:cache
  fi

  if echo "$BACKEND_CHANGED" | grep -q 'resources/views/'; then
    php artisan view:clear
    php artisan view:cache
  fi

  supervisorctl restart saat-queue:* 2>/dev/null || true
fi

if [[ -n "$FRONTEND_CHANGED" ]]; then
  print_status "Frontend changes detected..."
  cd "$APP_DIR/frontend"

  if echo "$FRONTEND_CHANGED" | grep -q 'package\.json\|package-lock\.json'; then
    npm ci --omit=dev || npm install --no-audit --no-fund
  fi

  if echo "$FRONTEND_CHANGED" | grep -qE 'src/|public/|index\.html|vite\.config|plugins/'; then
    print_status "Rebuilding frontend (fresh version.json)..."
    VITE_UPDATE_TYPE="${VITE_UPDATE_TYPE:-optional}" npm run build
    [[ -f public/version.json ]] && cp -f public/version.json dist/version.json
  fi
fi

if [[ -z "$FRONTEND_CHANGED" && -z "$BACKEND_CHANGED" ]]; then
  print_warning "No saat frontend/backend changes in last commit"
fi

systemctl reload php8.4-fpm 2>/dev/null || systemctl reload php8.3-fpm 2>/dev/null || true
systemctl reload nginx 2>/dev/null || true

print_status "Quick update finished"
curl -s "https://sat.center/version.json" | head -c 300 || true
echo
