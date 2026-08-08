#!/usr/bin/env bash
# Fix rostami.club Cloudflare DNS (525 SSL handshake) — origin must be the Bahram server IP.
# Requires CLOUDFLARE_API_TOKEN with Zone:DNS:Edit on the rostami.club zone.
set -euo pipefail

ORIGIN_IP="${ORIGIN_IP:-185.130.50.129}"
CLUB_ZONE="${CLUB_ZONE:-rostami.club}"
TOKEN="${CLOUDFLARE_API_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  if [[ -f /var/www/bahram-cm/backend/.env ]]; then
    TOKEN="$(grep -E '^CLOUDFLARE_API_TOKEN=' /var/www/bahram-cm/backend/.env | cut -d= -f2- | tr -d '"' | tr -d "'")"
  fi
fi

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: set CLOUDFLARE_API_TOKEN (rostami.club zone — may differ from rostami.app token)"
  exit 1
fi

api() {
  curl -fsS -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" "$@"
}

echo "==> Resolve zone id for ${CLUB_ZONE}"
ZONE_JSON="$(api "https://api.cloudflare.com/client/v4/zones?name=${CLUB_ZONE}")"
ZONE_ID="$(echo "$ZONE_JSON" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["result"][0]["id"]??"";')"
if [[ -z "$ZONE_ID" ]]; then
  echo "ERROR: zone not found or token lacks access to ${CLUB_ZONE}"
  echo "$ZONE_JSON" | head -c 400
  exit 1
fi
echo "ZONE_ID=${ZONE_ID}"

upsert_a() {
  local name="$1"
  local ip="$2"
  local proxied="${3:-true}"
  local list
  list="$(api "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=A&name=${name}")"
  local rid
  rid="$(echo "$list" | php -r '$j=json_decode(stream_get_contents(STDIN),true); echo $j["result"][0]["id"]??"";')"
  local body
  body="$(php -r "echo json_encode(['type'=>'A','name'=>'$name','content'=>'$ip','ttl'=>1,'proxied'=>filter_var('$proxied', FILTER_VALIDATE_BOOLEAN)]);")"
  if [[ -n "$rid" ]]; then
    echo "==> UPDATE A ${name} -> ${ip} (proxied=${proxied})"
    api -X PUT "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${rid}" -d "$body" >/dev/null
  else
    echo "==> CREATE A ${name} -> ${ip} (proxied=${proxied})"
    api -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" -d "$body" >/dev/null
  fi
}

upsert_a "${CLUB_ZONE}" "${ORIGIN_IP}" true
upsert_a "www.${CLUB_ZONE}" "${ORIGIN_IP}" true
upsert_a "family-cdn.${CLUB_ZONE}" "${ORIGIN_IP}" true

echo "==> SSL mode Full (strict)"
api -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/settings/ssl" \
  -d '{"value":"strict"}' >/dev/null

echo "==> Verify DNS (1.1.1.1)"
sleep 3
dig +short @1.1.1.1 "${CLUB_ZONE}" A || true
echo "DONE — test: curl -sI https://${CLUB_ZONE}/ | head -1"
