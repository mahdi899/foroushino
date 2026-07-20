#!/usr/bin/env bash
# Saat — backup policy:
#   - Database: every run (daily cron recommended)
#   - storage/app files: weekly (default Sunday)
#   - Retention: 30 days for both
#
# Cron: 0 3 * * * /var/www/saat/deploy/scripts/backup.sh
#
# Optional env:
#   RETENTION_DAYS=30          keep backups this many days (default 30)
#   FILES_BACKUP_WEEKDAY=0     0=Sun … 6=Sat (default 0 = Sunday)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/saat}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saat}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
FILES_BACKUP_WEEKDAY="${FILES_BACKUP_WEEKDAY:-0}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TODAY_WEEKDAY="$(date +%w)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/storage"

ENV_FILE="$APP_DIR/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

DB_HOST=$(grep -E '^DB_HOST=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
DB_PORT=$(grep -E '^DB_PORT=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
DB_DATABASE=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
DB_USERNAME=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')
DB_PASSWORD=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

echo "==> MySQL dump (daily)"
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" \
  --single-transaction --quick "$DB_DATABASE" \
  | gzip > "$BACKUP_DIR/db/saat_${TIMESTAMP}.sql.gz"

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]]; then
  echo "==> storage/app archive (weekly, weekday=${FILES_BACKUP_WEEKDAY})"
  if [[ -d "$APP_DIR/backend/storage/app" ]]; then
    tar -czf "$BACKUP_DIR/storage/saat_storage_${TIMESTAMP}.tar.gz" \
      -C "$APP_DIR/backend/storage" app
  fi
else
  echo "==> storage/app skipped (weekly on weekday ${FILES_BACKUP_WEEKDAY}, today is ${TODAY_WEEKDAY})"
fi

echo "==> Prune backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR/db" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR/storage" -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]] && [[ -f "$APP_DIR/backend/artisan" ]]; then
  echo "==> Upload weekly backup to download host (FTP/CDN)"
  (cd "$APP_DIR/backend" && php artisan backup:upload-download-host --force) \
    || echo "WARN: download-host upload failed" >&2
fi

echo "==> Backup complete: $TIMESTAMP"
