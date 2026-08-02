#!/usr/bin/env bash
# Bahram CM — production deploy script (Ubuntu self-hosted)
# Usage: ./deploy/scripts/deploy.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
cd "$APP_ROOT"

echo "==> Pull latest code"
GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"
if [[ -d "${GIT_ROOT}/.git" ]]; then
  cd "$GIT_ROOT"
  if ! git pull --ff-only origin main; then
    echo "WARN: git pull blocked — stashing local drift and retrying"
    git stash push -u -m "pre-deploy-$(date +%Y%m%d%H%M)" || true
    if ! git pull --ff-only origin main; then
      echo "WARN: git pull still failed — continuing with existing tree"
    fi
  fi
fi
APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
cd "$APP_ROOT"

echo "==> Backend dependencies"
cd "$APP_ROOT/backend"
composer install --no-dev --optimize-autoloader --no-interaction

echo "==> Run migrations (schema only — does NOT seed or wipe data)"
php artisan migrate --force
# SAFETY: never run DatabaseSeeder / db:seed / migrate:fresh / finish-deploy.sh
# on a live site. This script only migrates. Content stays intact across deploys.

echo "==> Sync Telegram bots from config"
php artisan telegram:sync-bots || echo "WARN: telegram:sync-bots failed"

# Re-apply durable Zaferaniyeh seminar roster (Excel + extras). Idempotent replace.
# Frontend build does not touch DB; this keeps attendees intact across deploys/reseeds of seminar meta.
if [[ -f "$APP_ROOT/backend/database/data/seminar_zaferaniyeh_attendees.json" ]]; then
  echo "==> Sync seminar attendee roster"
  php artisan seminar:sync-attendee-roster || echo "WARN: seminar:sync-attendee-roster failed"
fi

echo "==> Laravel production caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

echo "==> Storage link (idempotent)"
php artisan storage:link 2>/dev/null || true
php artisan media:guard-directories
php artisan media:sync-hosts --import 2>/dev/null || true
# Publish seminar covers/banners/gallery to the download host (CDN).
# Without this, primarySiteImageSrc points at cdn.rostami.app/media/site/* that 404.
if [[ -f "$APP_ROOT/backend/scripts/publish-seminar-banners.php" ]]; then
  echo "==> Publish seminar site media to CDN"
  php "$APP_ROOT/backend/scripts/publish-seminar-banners.php" || echo "WARN: publish-seminar-banners failed — covers may 404 on CDN"
fi
# Do NOT run family:refresh-demo here — it re-publishes demo posts/stories on every deploy.

if [[ -f "$APP_ROOT/deploy/php-fpm/99-bahram-uploads.ini" ]]; then
  echo "==> PHP upload limits"
  cp "$APP_ROOT/deploy/php-fpm/99-bahram-uploads.ini" /etc/php/8.4/fpm/conf.d/99-bahram-uploads.ini
fi

if [[ -f "$APP_ROOT/deploy/php-fpm/99-bahram-opcache.ini" ]]; then
  echo "==> PHP OPcache tuning"
  cp "$APP_ROOT/deploy/php-fpm/99-bahram-opcache.ini" /etc/php/8.4/fpm/conf.d/99-bahram-opcache.ini
fi

if [[ -f "$APP_ROOT/deploy/php-fpm/www.conf.snippet" ]]; then
  echo "==> PHP-FPM pool tuning"
  WWW_CONF=/etc/php/8.4/fpm/pool.d/www.conf
  if [[ -f "$WWW_CONF" ]]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      # Quote patterns: bare `;` in =~ regex is a statement terminator in bash.
      comment_semi=$'^[[:space:]]*;'
      comment_hash=$'^[[:space:]]*#'
      [[ "$line" =~ $comment_semi ]] && continue
      [[ "$line" =~ $comment_hash ]] && continue
      [[ -z "${line// }" ]] && continue
      key="${line%%=*}"; key="$(echo "$key" | xargs)"
      val="${line#*=}"; val="$(echo "$val" | xargs)"
      [[ -z "$key" || -z "$val" ]] && continue
      if grep -qE "^;?[[:space:]]*${key}[[:space:]]*=" "$WWW_CONF"; then
        sed -i -E "s|^;?[[:space:]]*${key}[[:space:]]*=.*|${key} = ${val}|" "$WWW_CONF"
      else
        printf '\n%s = %s\n' "$key" "$val" >> "$WWW_CONF"
      fi
    done < <(grep -E '^(pm\.|request_slowlog_timeout|slowlog)' "$APP_ROOT/deploy/php-fpm/www.conf.snippet" || true)
  fi
fi

if [[ -f "$APP_ROOT/deploy/scripts/tune-mysql.sh" ]]; then
  echo "==> MySQL/Redis high-traffic tuning"
  # Idempotent; restarts MySQL only when applying (first run / RAM change).
  bash "$APP_ROOT/deploy/scripts/tune-mysql.sh" || echo "WARN: tune-mysql.sh failed — check MySQL manually"
fi

# Reload unconditionally: opcache.validate_timestamps=0 means workers only
# pick up new code on restart/reload, not automatically like before.
echo "==> Reload php8.4-fpm"
systemctl reload php8.4-fpm 2>/dev/null || systemctl restart php8.4-fpm 2>/dev/null || true

if [[ -f "$APP_ROOT/deploy/nginx/snippets/media-cors.conf" ]]; then
  echo "==> Nginx snippets + sites"
  mkdir -p /etc/nginx/snippets /etc/nginx/conf.d
  cp "$APP_ROOT/deploy/nginx/snippets/media-cors.conf" /etc/nginx/snippets/media-cors.conf
  cp "$APP_ROOT/deploy/nginx/snippets/media-stream.conf" /etc/nginx/snippets/media-stream.conf
  if [[ -f "$APP_ROOT/deploy/nginx/snippets/updating-page.conf" ]]; then
    cp "$APP_ROOT/deploy/nginx/snippets/updating-page.conf" /etc/nginx/snippets/updating-page.conf
  fi
  cp "$APP_ROOT/deploy/nginx/conf.d/rostami-upstreams.conf" /etc/nginx/conf.d/rostami-upstreams.conf
  if [[ -f "$APP_ROOT/deploy/nginx/conf.d/rostami-microcache.conf" ]]; then
    install -d -o www-data -g www-data /var/cache/nginx/rostami_next
    cp "$APP_ROOT/deploy/nginx/conf.d/rostami-microcache.conf" /etc/nginx/conf.d/rostami-microcache.conf
  fi
  # `include sites-enabled/*` also pulls in editor/rollback leftovers, which
  # duplicate every server_name and make nginx pick an arbitrary vhost.
  mkdir -p /etc/nginx/sites-disabled
  find /etc/nginx/sites-enabled -maxdepth 1 -type f \
    \( -name '*.bak' -o -name '*.bak.*' -o -name '*.save' -o -name '*~' \) \
    -exec mv -t /etc/nginx/sites-disabled/ {} + 2>/dev/null || true
  if [[ -f "$APP_ROOT/deploy/nginx/rostami-app.conf" && -f /etc/nginx/sites-available/rostami-app.conf ]]; then
    if grep -q 'listen 443' /etc/nginx/sites-available/rostami-app.conf 2>/dev/null; then
      cp "$APP_ROOT/deploy/nginx/rostami-app.conf" /etc/nginx/sites-available/rostami-app.conf
    elif [[ -f "$APP_ROOT/deploy/nginx/rostami-app-origin.conf" ]]; then
      cp "$APP_ROOT/deploy/nginx/rostami-app-origin.conf" /etc/nginx/sites-available/rostami-app.conf
    else
      cp "$APP_ROOT/deploy/nginx/rostami-app.conf" /etc/nginx/sites-available/rostami-app.conf
    fi
  fi
  if [[ -f "$APP_ROOT/deploy/nginx/rostami-club.conf" && -f /etc/nginx/sites-available/rostami-club.conf ]]; then
    cp "$APP_ROOT/deploy/nginx/rostami-club.conf" /etc/nginx/sites-available/rostami-club.conf
  fi
  nginx -t && systemctl reload nginx
fi

echo "==> Frontend build"
cd "$APP_ROOT/frontend"
if [[ -r /proc/meminfo ]]; then
  AVAIL_MB="$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)"
  echo "MemAvailable=${AVAIL_MB}MB"
  if [[ "${AVAIL_MB:-0}" -lt 1800 ]]; then
    echo "SKIP frontend build — need >= 1800MB MemAvailable (use CI .next or rebuild-frontend.sh later)"
    if [[ ! -f .next/BUILD_ID ]]; then
      echo "ERROR: no .next/BUILD_ID and build skipped"
      exit 1
    fi
  else
    # devDependencies (e.g. @next/bundle-analyzer) are required for next.config.ts at build time.
    unset NODE_ENV
    export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
    if ! npm ci; then npm install --no-audit --no-fund; fi
    export NODE_ENV=production
    export NEXT_DEPLOY_REV="$(git -C "${GIT_ROOT}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
    echo "NEXT_DEPLOY_REV=${NEXT_DEPLOY_REV}"
    rm -rf .next
    npm run build
  fi
else
  unset NODE_ENV
  if ! npm ci; then npm install --no-audit --no-fund; fi
  export NODE_ENV=production
  export NEXT_DEPLOY_REV="$(git -C "${GIT_ROOT}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M)"
  echo "NEXT_DEPLOY_REV=${NEXT_DEPLOY_REV}"
  rm -rf .next
  npm run build
fi

echo "==> Reload PM2 (Next.js)"
PM2_CONFIG="$APP_ROOT/deploy/pm2/ecosystem.config.cjs"
pm2 reload "$PM2_CONFIG" --update-env || pm2 start "$PM2_CONFIG"

echo "==> Restart queue workers"
sudo supervisorctl restart bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler 2>/dev/null \
  || sudo supervisorctl restart bahram-queue:*

echo "==> OPcache reset (if available)"
php -r "if (function_exists('opcache_reset')) { opcache_reset(); echo 'OPcache reset'; }" || true

echo "==> Purge edge + nginx microcache"
rm -rf /var/cache/nginx/rostami_next/* 2>/dev/null || true
if [[ -f "$APP_ROOT/backend/scripts/purge-cdn.php" ]]; then
  php "$APP_ROOT/backend/scripts/purge-cdn.php" || echo "WARN: CDN purge skipped (configure Cloudflare in admin)"
fi

echo "==> Deploy complete"
