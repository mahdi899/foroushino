#!/usr/bin/env bash
# Saat — backup policy:
#   - Database: every run (daily cron recommended) — keep 30 days
#   - Full (DB + storage/app): weekly (default Sunday) — keep 90 days
#
# Cron: 0 3 * * * /var/www/saat/deploy/scripts/backup.sh
#
# Optional env:
#   RETENTION_DAYS_DB=30       daily DB retention (default 30)
#   RETENTION_DAYS_WEEKLY=90   weekly full retention (default 90)
#   FILES_BACKUP_WEEKDAY=0     0=Sun … 6=Sat (default 0 = Sunday)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/saat}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/saat}"
RETENTION_DAYS_DB="${RETENTION_DAYS_DB:-30}"
RETENTION_DAYS_WEEKLY="${RETENTION_DAYS_WEEKLY:-90}"
FILES_BACKUP_WEEKDAY="${FILES_BACKUP_WEEKDAY:-0}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TODAY_WEEKDAY="$(date +%w)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/weekly" "$BACKUP_DIR/storage"

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

echo "==> MySQL dump (daily — retain ${RETENTION_DAYS_DB} days)"
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" \
  --single-transaction --quick "$DB_DATABASE" \
  | gzip > "$BACKUP_DIR/db/saat_${TIMESTAMP}.sql.gz"

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]]; then
  echo "==> Weekly full backup via Laravel (DB + storage — retain ${RETENTION_DAYS_WEEKLY} days)"
  if [[ -f "$APP_DIR/backend/artisan" ]]; then
    (cd "$APP_DIR/backend" && php artisan backup:weekly-full --force) \
      || echo "WARN: artisan backup:weekly-full failed" >&2
    (cd "$APP_DIR/backend" && php artisan backup:upload-download-host --force) \
      || echo "WARN: download-host upload failed" >&2
  fi

  echo "==> storage/app archive (shell mirror)"
  if [[ -d "$APP_DIR/backend/storage/app" ]]; then
    tar -czf "$BACKUP_DIR/storage/saat_storage_${TIMESTAMP}.tar.gz" \
      -C "$APP_DIR/backend/storage" app
  fi
else
  echo "==> Weekly full skipped (runs on weekday ${FILES_BACKUP_WEEKDAY}, today is ${TODAY_WEEKDAY})"
fi

echo "==> Prune daily DB backups older than ${RETENTION_DAYS_DB} days"
find "$BACKUP_DIR/db" -name '*.sql.gz' -mtime +"$RETENTION_DAYS_DB" -delete

echo "==> Prune weekly archives older than ${RETENTION_DAYS_WEEKLY} days"
find "$BACKUP_DIR/storage" -name '*.tar.gz' -mtime +"$RETENTION_DAYS_WEEKLY" -delete
find "$BACKUP_DIR/weekly" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS_WEEKLY" -exec rm -rf {} + 2>/dev/null || true

echo "==> Backup complete: $TIMESTAMP"
