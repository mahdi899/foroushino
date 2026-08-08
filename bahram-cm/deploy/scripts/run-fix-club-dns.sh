#!/usr/bin/env bash
set -euo pipefail
cd /var/www/bahram-cm/backend
php /tmp/export-cf-token.php
TOKEN="$(tr -d '\n' < /tmp/cf_token.txt)"
echo "token_len=${#TOKEN}"
if [[ "${#TOKEN}" -lt 10 ]]; then
  echo "NO_CLOUDFLARE_TOKEN — fix DNS manually in Cloudflare dashboard for zone rostami.club"
  echo "Set A records @, www, family-cdn to 185.130.50.129 (proxied), SSL Full (strict)"
  exit 2
fi
export CLOUDFLARE_API_TOKEN="$TOKEN"
bash /tmp/fix-club-dns.sh
