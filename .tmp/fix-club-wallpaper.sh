#!/usr/bin/env bash
set -euo pipefail

cd /var/www/bahram-cm/backend
php /tmp/publish-wallpaper.php

CONF=/etc/nginx/sites-available/rostami-club.conf
if ! grep -q 'location ^~ /storage/media/' "$CONF"; then
  python3 - <<'PY'
from pathlib import Path
path = Path('/etc/nginx/sites-available/rostami-club.conf')
text = path.read_text()
needle = '    # Family media playback — same-origin proxy to cdn.rostami.app'
block = '''    # Site gallery storage (family wallpaper / brand assets) — same disk as Laravel.
    location ^~ /storage/media/ {
        alias /var/www/bahram-cm/backend/storage/app/public/media/;
        include /etc/nginx/snippets/media-cors.conf;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header CDN-Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

'''
if needle not in text:
    raise SystemExit('needle not found in rostami-club.conf')
if 'location ^~ /storage/media/' in text:
    print('nginx snippet already present')
else:
    path.write_text(text.replace(needle, block + needle, 1))
    print('nginx snippet inserted')
PY
else
  echo 'nginx snippet already present'
fi

# Keep deploy repo copy in sync for next deploys
REPO_CONF=/var/www/bahram-cm/deploy/nginx/rostami-club.conf
if [[ -f "$REPO_CONF" ]] && ! grep -q 'location ^~ /storage/media/' "$REPO_CONF"; then
  python3 - <<'PY'
from pathlib import Path
path = Path('/var/www/bahram-cm/deploy/nginx/rostami-club.conf')
text = path.read_text()
needle = '    # Family media playback — same-origin proxy to cdn.rostami.app'
block = '''    # Site gallery storage (family wallpaper / brand assets) — same disk as Laravel.
    location ^~ /storage/media/ {
        alias /var/www/bahram-cm/backend/storage/app/public/media/;
        include /etc/nginx/snippets/media-cors.conf;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        add_header CDN-Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

'''
if needle in text and 'location ^~ /storage/media/' not in text:
    path.write_text(text.replace(needle, block + needle, 1))
    print('repo nginx conf updated')
PY
fi

nginx -t
systemctl reload nginx

echo '=== verify ==='
sleep 1
curl -sI -o /dev/null -w 'cdn=%{http_code} size=%{size_download}\n' \
  'https://cdn.rostami.app/media/site/family-chat-wallpaper.webp' || true
curl -sI -o /dev/null -w 'club_storage=%{http_code} size=%{size_download}\n' \
  'https://rostami.club/storage/media/site/family-chat-wallpaper.webp' || true
curl -sI -o /dev/null -w 'club_media=%{http_code} size=%{size_download}\n' \
  'https://rostami.club/media/site/family-chat-wallpaper.webp' || true
