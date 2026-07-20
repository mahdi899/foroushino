#!/usr/bin/env bash
# Bahram CM — origin SSL + Nginx + PM2 setup (Ubuntu, behind Cloudflare CDN)
#
# Usage (on server as root):
#   curl -fsSL ... | bash
#   # or after git clone:
#   sudo bash /var/www/bahram-cm/deploy/scripts/setup-origin-ssl.sh
#
# Prerequisites:
#   - DNS A records for rostami.app, www, cdn, rostami.club, www, family-cdn → 193.228.90.175
#   - Cloudflare SSL mode: Full (strict) after certs are issued
#   - Repo cloned at /var/www/foroushino (symlink /var/www/bahram-cm)
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

GIT_ROOT="${GIT_ROOT:-/var/www/foroushino}"
APP_ROOT="${APP_ROOT:-/var/www/bahram-cm}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-shokspy@gmail.com}"
CERTBOT_WEBROOT="${CERTBOT_WEBROOT:-/var/www/certbot}"
ORIGIN_IP="${ORIGIN_IP:-193.228.90.175}"

echo "============================================"
echo " Bahram CM — Origin SSL + Nginx + PM2"
echo " Server IP: ${ORIGIN_IP}"
echo "============================================"

echo "==> [1/8] System packages"
apt-get update -qq
apt-get install -y -qq \
  nginx git curl unzip ca-certificates gnupg lsb-release \
  certbot \
  php8.4-fpm php8.4-cli php8.4-mysql php8.4-redis php8.4-mbstring \
  php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp

if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

systemctl enable --now nginx php8.4-fpm

echo "==> [2/8] Certbot webroot"
mkdir -p "${CERTBOT_WEBROOT}"
chown -R www-data:www-data "${CERTBOT_WEBROOT}"

echo "==> [3/8] Nginx shared config"
mkdir -p /etc/nginx/conf.d /etc/nginx/snippets
cp "${APP_ROOT}/deploy/nginx/conf.d/cloudflare-real-ip.conf" /etc/nginx/conf.d/cloudflare-real-ip.conf
cp "${APP_ROOT}/deploy/nginx/conf.d/rostami-upstreams.conf" /etc/nginx/conf.d/rostami-upstreams.conf
cp "${APP_ROOT}/deploy/nginx/snippets/acme-webroot.conf" /etc/nginx/snippets/acme-webroot.conf

echo "==> [4/8] HTTP-only bootstrap (for ACME challenge)"
cat > /etc/nginx/sites-available/rostami-acme-bootstrap.conf <<EOF
# Temporary — HTTP only for Let's Encrypt webroot. Replaced after cert issuance.
server {
    listen 80;
    listen [::]:80;
    server_name rostami.app www.rostami.app cdn.rostami.app rostami.club www.rostami.club family-cdn.rostami.club ${ORIGIN_IP};

    include /etc/nginx/snippets/acme-webroot.conf;

    location / {
        return 200 'ACME bootstrap — SSL pending\n';
        add_header Content-Type text/plain;
    }
}
EOF

rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/rostami-acme-bootstrap.conf /etc/nginx/sites-enabled/rostami-acme-bootstrap.conf
nginx -t
systemctl reload nginx

echo "==> [5/8] Issue SSL certificates (webroot)"
if [[ ! -f /etc/letsencrypt/live/rostami.app/fullchain.pem ]]; then
  certbot certonly --webroot \
    -w "${CERTBOT_WEBROOT}" \
    -d rostami.app -d www.rostami.app -d cdn.rostami.app \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos --non-interactive --no-eff-email
else
  echo "rostami.app cert already exists — skipping"
fi

if [[ ! -f /etc/letsencrypt/live/rostami.club/fullchain.pem ]]; then
  certbot certonly --webroot \
    -w "${CERTBOT_WEBROOT}" \
    -d rostami.club -d www.rostami.club -d family-cdn.rostami.club \
    --email "${CERTBOT_EMAIL}" \
    --agree-tos --non-interactive --no-eff-email
else
  echo "rostami.club cert already exists — skipping"
fi

echo "==> [6/8] Install production Nginx vhosts"
rm -f /etc/nginx/sites-enabled/rostami-acme-bootstrap.conf
cp "${APP_ROOT}/deploy/nginx/rostami-app.conf" /etc/nginx/sites-available/rostami-app.conf
cp "${APP_ROOT}/deploy/nginx/rostami-club.conf" /etc/nginx/sites-available/rostami-club.conf
ln -sf /etc/nginx/sites-available/rostami-app.conf /etc/nginx/sites-enabled/rostami-app.conf
ln -sf /etc/nginx/sites-available/rostami-club.conf /etc/nginx/sites-enabled/rostami-club.conf
nginx -t
systemctl reload nginx

echo "==> [7/8] Build Flutter admin + PM2"
mkdir -p /var/log/pm2
if [[ -d "${GIT_ROOT}/bahram-family-manager" ]]; then
  bash "${GIT_ROOT}/bahram-family-manager/scripts/build-web-production.sh"
fi

pm2 delete bahram-frontend family-manager-web 2>/dev/null || true
pm2 start "${APP_ROOT}/deploy/pm2/ecosystem.config.cjs"
pm2 save
env PATH="$PATH:/usr/bin" pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true

echo "==> [8/8] Certbot auto-renew hook"
if [[ ! -f /etc/cron.d/certbot-renew-nginx ]]; then
  cat > /etc/cron.d/certbot-renew-nginx <<'CRON'
0 3 * * * root certbot renew --quiet --deploy-hook "systemctl reload nginx"
CRON
fi

echo ""
echo "============================================"
echo " Done!"
echo ""
echo " Verify:"
echo "   curl -I https://rostami.app"
echo "   curl -I https://rostami.club"
echo "   curl -I https://rostami.club/admin/"
echo "   pm2 list"
echo "   ss -tlnp | grep -E ':3000|:7358|:443'"
echo ""
echo " Cloudflare:"
echo "   SSL/TLS mode → Full (strict)"
echo "   DNS A records → ${ORIGIN_IP}"
echo "============================================"
