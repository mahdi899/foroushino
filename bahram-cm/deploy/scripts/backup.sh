#!/usr/bin/env bash
# Bahram CM — backup policy:
#   - Database: every run (daily cron recommended)
#   - Media files: weekly (default Sunday)
#   - Retention: 30 days for both
#
# Cron: 0 3 * * * /var/www/bahram-cm/deploy/scripts/backup.sh
#
# Optional env:
#   RETENTION_DAYS=30          keep backups this many days (default 30)
#   FILES_BACKUP_WEEKDAY=0     0=Sun … 6=Sat (default 0 = Sunday)
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bahram}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
FILES_BACKUP_WEEKDAY="${FILES_BACKUP_WEEKDAY:-0}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TODAY_WEEKDAY="$(date +%w)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/media"

ENV_FILE="$APP_ROOT/backend/.env"
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
  | gzip > "$BACKUP_DIR/db/bahram_${TIMESTAMP}.sql.gz"

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]]; then
  echo "==> Media archive (weekly, weekday=${FILES_BACKUP_WEEKDAY})"
  tar -czf "$BACKUP_DIR/media/bahram_media_${TIMESTAMP}.tar.gz" \
    -C "$APP_ROOT/backend/storage/app/public" media 2>/dev/null || true
else
  echo "==> Media skipped (weekly on weekday ${FILES_BACKUP_WEEKDAY}, today is ${TODAY_WEEKDAY})"
fi

echo "==> Prune backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR/db" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR/media" -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]] && [[ -f "$APP_ROOT/backend/artisan" ]]; then
  echo "==> Upload weekly backup to download host (FTP/CDN)"
  (cd "$APP_ROOT/backend" && php artisan backup:upload-download-host --force) \
    || echo "WARN: download-host upload failed" >&2
fi

echo "==> Backup complete: $TIMESTAMP"
