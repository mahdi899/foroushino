#!/usr/bin/env bash
# Saat (سات) — production deploy for sat.center
# Usage (on server):
#   ./deploy/scripts/deploy.sh [all|backend|frontend|rollback|health]
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/saat}"
GIT_ROOT="${GIT_ROOT:-/var/www/mini-call-center}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saat}"
DOMAIN="${DOMAIN:-https://sat.center}"
DATE=$(date +%Y%m%d_%H%M%S)
BRANCH="${BRANCH:-main}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status()  { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

if [[ ! -d "$APP_DIR" ]]; then
  print_error "App directory not found: $APP_DIR"
  print_error "Run bootstrap first or set APP_DIR / symlink saat → this path."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

backup() {
  print_status "Creating backup..."

  if command -v mysqldump >/dev/null 2>&1; then
    # Reads DB_* from backend .env if present
    if [[ -f "$APP_DIR/backend/.env" ]]; then
      # shellcheck disable=SC1091
      set -a
      # shellcheck disable=SC1090
      source <(grep -E '^(DB_DATABASE|DB_USERNAME|DB_PASSWORD|DB_HOST)=' "$APP_DIR/backend/.env" | sed 's/\r$//')
      set +a
      mysqldump -h "${DB_HOST:-127.0.0.1}" -u "${DB_USERNAME:-root}" \
        ${DB_PASSWORD:+-p"$DB_PASSWORD"} "${DB_DATABASE:-saat}" \
        > "$BACKUP_DIR/db_backup_$DATE.sql" 2>/dev/null \
        || print_warning "Database backup failed"
    fi
  else
    print_warning "mysqldump not found — skipping DB backup"
  fi

  if [[ -d "$APP_DIR/backend/storage" ]]; then
    cp -a "$APP_DIR/backend/storage" "$BACKUP_DIR/storage_backup_$DATE"
  fi

  if [[ -d "$GIT_ROOT/.git" ]]; then
    (cd "$GIT_ROOT" && git rev-parse HEAD > "$BACKUP_DIR/git_commit_$DATE.txt")
  elif [[ -d "$APP_DIR/.git" ]]; then
    (cd "$APP_DIR" && git rev-parse HEAD > "$BACKUP_DIR/git_commit_$DATE.txt")
  fi

  print_status "Backup completed: $BACKUP_DIR ($DATE)"
}

pull_code() {
  if [[ -d "$GIT_ROOT/.git" ]]; then
    print_status "Pulling $BRANCH in $GIT_ROOT..."
    cd "$GIT_ROOT"
    git fetch origin "$BRANCH" || true
    git pull --ff-only origin "$BRANCH" || print_warning "git pull failed — continuing with existing tree"
  elif [[ -d "$APP_DIR/.git" ]]; then
    print_status "Pulling $BRANCH in $APP_DIR..."
    cd "$APP_DIR"
    git pull --ff-only origin "$BRANCH" || print_warning "git pull failed — continuing with existing tree"
  else
    print_warning "No git repo found — skipping pull"
  fi
}

deploy_backend() {
  print_status "Deploying backend..."
  cd "$APP_DIR/backend"

  composer install --optimize-autoloader --no-dev --no-interaction

  php artisan migrate --force
  php artisan storage:link 2>/dev/null || true

  php artisan config:clear
  php artisan route:clear
  php artisan view:clear
  php artisan cache:clear
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache

  chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true
  chmod -R 775 storage bootstrap/cache 2>/dev/null || true

  if command -v supervisorctl >/dev/null 2>&1; then
    supervisorctl restart saat-queue:* 2>/dev/null || print_warning "Could not restart saat-queue"
  fi

  print_status "Backend deployment completed"
}

deploy_frontend() {
  print_status "Deploying frontend..."
  cd "$APP_DIR/frontend"

  if [[ -f .env.production.example ]] && [[ ! -f .env.production ]]; then
    cp .env.production.example .env.production
    print_status "Created .env.production from example"
  fi

  if ! npm ci --omit=dev; then
    npm install --no-audit --no-fund
  fi

  # Professional update pipeline: fresh buildHash in version.json
  VITE_UPDATE_TYPE="${VITE_UPDATE_TYPE:-optional}" npm run build

  # Ensure version.json is at dist root (plugin writes to public/)
  if [[ -f public/version.json ]]; then
    cp -f public/version.json dist/version.json
  fi

  print_status "Frontend build hash:"
  if command -v jq >/dev/null 2>&1; then
    jq -r '.buildHash + " (" + .version + ")"' dist/version.json 2>/dev/null || cat dist/version.json
  else
    cat dist/version.json
  fi

  print_status "Frontend deployment completed"
}

health_check() {
  print_status "Health check against $DOMAIN..."

  FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/" || echo "000")
  if [[ "$FRONTEND_STATUS" == "200" ]]; then
    print_status "Frontend OK (HTTP $FRONTEND_STATUS)"
  else
    print_error "Frontend not healthy (HTTP $FRONTEND_STATUS)"
  fi

  VERSION_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Cache-Control: no-cache" "$DOMAIN/version.json" || echo "000")
  if [[ "$VERSION_STATUS" == "200" ]]; then
    print_status "version.json OK"
    curl -s "$DOMAIN/version.json" | head -c 400 || true
    echo
  else
    print_error "version.json not healthy (HTTP $VERSION_STATUS)"
  fi

  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Accept: application/json" "$DOMAIN/api/v1/health" || echo "000")
  if [[ "$API_STATUS" == "200" ]]; then
    print_status "API health OK (HTTP $API_STATUS)"
  else
    print_error "API not healthy (HTTP $API_STATUS)"
  fi

  systemctl is-active nginx >/dev/null && print_status "Nginx running" || print_error "Nginx down"
  systemctl is-active php8.3-fpm >/dev/null 2>&1 \
    || systemctl is-active php8.2-fpm >/dev/null 2>&1 \
    && print_status "PHP-FPM running" \
    || print_error "PHP-FPM down"
}

rollback() {
  print_status "Rolling back..."
  LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/db_backup_*.sql 2>/dev/null | head -1 || true)
  if [[ -z "$LATEST_BACKUP" ]]; then
    print_error "No backup found"
    exit 1
  fi

  BACKUP_DATE=$(basename "$LATEST_BACKUP" | sed 's/db_backup_\(.*\)\.sql/\1/')

  if [[ -f "$APP_DIR/backend/.env" ]]; then
    set -a
    # shellcheck disable=SC1090
    source <(grep -E '^(DB_DATABASE|DB_USERNAME|DB_PASSWORD|DB_HOST)=' "$APP_DIR/backend/.env" | sed 's/\r$//')
    set +a
    print_status "Restoring DB from $BACKUP_DATE..."
    mysql -h "${DB_HOST:-127.0.0.1}" -u "${DB_USERNAME:-root}" \
      ${DB_PASSWORD:+-p"$DB_PASSWORD"} "${DB_DATABASE:-saat}" < "$BACKUP_DIR/db_backup_$BACKUP_DATE.sql"
  fi

  if [[ -d "$BACKUP_DIR/storage_backup_$BACKUP_DATE" ]]; then
    print_status "Restoring storage..."
    rm -rf "$APP_DIR/backend/storage"
    cp -a "$BACKUP_DIR/storage_backup_$BACKUP_DATE" "$APP_DIR/backend/storage"
  fi

  if [[ -f "$BACKUP_DIR/git_commit_$BACKUP_DATE.txt" ]]; then
    GIT_COMMIT=$(cat "$BACKUP_DIR/git_commit_$BACKUP_DATE.txt")
    print_status "Checking out $GIT_COMMIT..."
    if [[ -d "$GIT_ROOT/.git" ]]; then
      (cd "$GIT_ROOT" && git checkout "$GIT_COMMIT")
    elif [[ -d "$APP_DIR/.git" ]]; then
      (cd "$APP_DIR" && git checkout "$GIT_COMMIT")
    fi
    deploy_backend
    deploy_frontend
  fi

  systemctl reload php8.3-fpm 2>/dev/null || systemctl reload php8.2-fpm 2>/dev/null || true
  systemctl reload nginx
  print_status "Rollback completed"
}

DEPLOY_TYPE="${1:-all}"
print_status "Starting deployment: $DEPLOY_TYPE @ $(date)"

case "$DEPLOY_TYPE" in
  health)
    health_check
    ;;
  rollback)
    rollback
    ;;
  backend)
    backup
    pull_code
    deploy_backend
    systemctl reload php8.3-fpm 2>/dev/null || systemctl reload php8.2-fpm 2>/dev/null || true
    health_check
    ;;
  frontend)
    backup
    pull_code
    deploy_frontend
    systemctl reload nginx
    health_check
    ;;
  all)
    backup
    pull_code
    deploy_backend
    deploy_frontend
    systemctl reload php8.3-fpm 2>/dev/null || systemctl reload php8.2-fpm 2>/dev/null || true
    systemctl reload nginx
    health_check
    ;;
  *)
    echo "Usage: $0 [all|backend|frontend|rollback|health]"
    exit 1
    ;;
esac

print_status "Done."
