#!/usr/bin/env bash
# Bahram CM — backup policy:
#   - Database: every run (daily cron recommended) — full mysqldump via Laravel
#   - Public media: weekly (default Sunday) — storage/app/public/media
#   - Private media (KYC docs/videos): weekly — storage/app/private (separate archive)
#   - Retention: 30 days for all local archives
#   - Weekly offsite: both media zips uploaded to download host via artisan
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

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/media" "$BACKUP_DIR/private"

ENV_FILE="$APP_ROOT/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi

if [[ ! -f "$APP_ROOT/backend/artisan" ]]; then
  echo "ERROR: Laravel artisan not found at $APP_ROOT/backend/artisan" >&2
  exit 1
fi

echo "==> MySQL full dump via Laravel (schema + data, up to 3 retries, Telegram alert on failure)"
(
  cd "$APP_ROOT/backend"
  BACKUP_DATABASE_DIR="$BACKUP_DIR/db" php artisan backup:database --force --no-telegram
)

echo "==> Latest database backups:"
ls -lt "$BACKUP_DIR/db"/*.sql.gz 2>/dev/null | head -3 || true

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]]; then
  echo "==> Public media archive (weekly, weekday=${FILES_BACKUP_WEEKDAY})"
  tar -czf "$BACKUP_DIR/media/bahram_media_${TIMESTAMP}.tar.gz" \
    -C "$APP_ROOT/backend/storage/app/public" media 2>/dev/null || true

  echo "==> Private media archive — KYC cards/videos (weekly)"
  tar -czf "$BACKUP_DIR/private/bahram_private_${TIMESTAMP}.tar.gz" \
    -C "$APP_ROOT/backend/storage/app" private 2>/dev/null || true
else
  echo "==> Media skipped (weekly on weekday ${FILES_BACKUP_WEEKDAY}, today is ${TODAY_WEEKDAY})"
fi

echo "==> Prune backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR/db" -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR/media" -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_DIR/private" -name '*.tar.gz' -mtime +"$RETENTION_DAYS" -delete

if [[ "$TODAY_WEEKDAY" == "$FILES_BACKUP_WEEKDAY" ]]; then
  echo "==> Upload weekly backup to download host (FTP/CDN)"
  (cd "$APP_ROOT/backend" && php artisan backup:upload-download-host --force) \
    || echo "WARN: download-host upload failed" >&2
fi

echo "==> Backup complete: $TIMESTAMP"
