#!/usr/bin/env bash
# Bahram CM — daily backup (MySQL + media)
# Cron: 0 3 * * * /var/www/bahram-cm/deploy/scripts/backup.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/bahram}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/media"

# Load DB credentials from Laravel .env
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

echo "==> MySQL dump"
mysqldump -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" -p"$DB_PASSWORD" \
  --single-transaction --quick "$DB_DATABASE" \
  | gzip > "$BACKUP_DIR/db/bahram_${TIMESTAMP}.sql.gz"

echo "==> Media sync"
tar -czf "$BACKUP_DIR/media/bahram_media_${TIMESTAMP}.tar.gz" \
  -C "$APP_ROOT/backend/storage/app/public" media 2>/dev/null || true

echo "==> Prune backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR/db" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR/media" -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

echo "==> Backup complete: $TIMESTAMP"
