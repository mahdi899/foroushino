#!/usr/bin/env bash
# Ensure origin DNS + local resolver see rostami.club correctly (Iran poisoned 10.10.34.34).
set -euo pipefail
ORIGIN_IP="${ORIGIN_IP:-185.130.50.129}"
HOSTS_LINE="${ORIGIN_IP} rostami.club www.rostami.club family-cdn.rostami.club"

if ! grep -qE '^[0-9.]+[[:space:]]+rostami\.club$' /etc/hosts; then
  echo "==> Add /etc/hosts entries for club domains -> ${ORIGIN_IP}"
  echo "$HOSTS_LINE" >> /etc/hosts
else
  sed -i -E "s/^[0-9.]+[[:space:]]+rostami\.club.*/${HOSTS_LINE}/" /etc/hosts
fi

echo "==> Current /etc/hosts club lines:"
grep rostami.club /etc/hosts || true

echo "==> Test local HTTPS (bypass poisoned resolver)"
curl -skI --resolve rostami.club:443:127.0.0.1 https://rostami.club/ | head -4

echo "==> Test via /etc/hosts"
curl -skI https://rostami.club/ 2>/dev/null | head -4 || echo "curl via hosts failed"

echo "==> Public resolver (may show poisoned IP in Iran):"
getent ahostsv4 rostami.club 2>/dev/null | head -3 || true

echo "DONE — Cloudflare dashboard must have A @ -> ${ORIGIN_IP} (proxied), SSL Full (strict)"
