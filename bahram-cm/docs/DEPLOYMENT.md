# Deployment Guide — Bahram CM (Ubuntu Self-hosted)

این راهنما deploy **Next.js** (`frontend/`) و **Laravel** (`backend/`) روی **Ubuntu + Nginx + PHP-FPM + PM2 + Redis + MySQL** را شرح می‌دهد.

**فایل‌های زیرساخت:** [`deploy/`](../deploy/)  
**CDN ابر آروان (fashio.ir):** [`ARVAN-CDN.md`](ARVAN-CDN.md)

CI در `.github/workflows/ci.yml` lint، typecheck، build و PHPUnit را اجرا می‌کند.

---

## 1. پیش‌نیازهای سرور

| نرم‌افزار | نسخه |
|-----------|------|
| Ubuntu | 22.04 LTS یا 24.04 LTS |
| Node.js | 20 LTS |
| PHP | 8.2+ (extensions: mbstring, xml, curl, mysql, redis, gd, intl, zip, bcmath) |
| Composer | 2.x |
| MySQL | 8.0+ |
| Redis | 7.x |
| Nginx | 1.24+ |
| PM2 | `npm i -g pm2` |
| Supervisor | `apt install supervisor` |
| Certbot | SSL (Let's Encrypt) |

```bash
# نمونه نصب پایه
sudo apt update && sudo apt install -y nginx php8.2-fpm php8.2-mysql php8.2-redis \
  php8.2-mbstring php8.2-xml php8.2-curl php8.2-gd php8.2-intl php8.2-zip php8.2-bcmath \
  mysql-server redis-server supervisor certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

## 2. Clone و ساختار

```bash
sudo mkdir -p /var/www
sudo git clone <repo-url> /var/www/bahram-cm
sudo chown -R www-data:www-data /var/www/bahram-cm
```

---

## 3. Backend (`backend/`)

```bash
cd /var/www/bahram-cm/backend
cp .env.example .env
# ویرایش .env — بخش PRODUCTION را ببینید
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=CacheIntegrationsSeeder
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### متغیرهای مهم Production (fashio.ir)

| Variable | مقدار پیشنهادی |
|----------|----------------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `http://127.0.0.1:8010` (فقط داخلی — **نه** api.fashio.ir) |
| `FRONTEND_URL` | `https://fashio.ir` |
| `CORS_ALLOWED_ORIGINS` | `https://fashio.ir` |
| `MEDIA_URL` | `https://cdn.fashio.ir` |
| `CACHE_STORE` | `redis` |
| `QUEUE_CONNECTION` | `redis` |
| `SESSION_DRIVER` | `redis` |
| `SESSION_SECURE_COOKIE` | `true` |
| `OTP_DEV_MODE` | `false` |
| `LOG_LEVEL` | `warning` |
| `REVALIDATE_SECRET` | secret قوی تصادفی |
| `INTERNAL_API_SECRET` | secret جدا از REVALIDATE |
| `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 |

> **مهم:** API عمومی (`api.fashio.ir`) باز نکنید. مرورگر فقط `https://fashio.ir/api/*` را صدا می‌زند؛ Next.js به `127.0.0.1:8010` پروکسی می‌کند.

---

## 4. Frontend (`frontend/`)

```bash
cd /var/www/bahram-cm/frontend
cp .env.example .env.local
# تنظیم env vars
npm ci
npm run verify
npm run build
pm2 start /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup  # دستور systemd را اجرا کنید
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://fashio.ir` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://fashio.ir` (same-origin — نه subdomain جدا) |
| `BACKEND_PROXY_URL` | `http://127.0.0.1:8010` (داخلی) |
| `NEXT_PUBLIC_CDN_ORIGIN` | `https://cdn.fashio.ir` |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 |
| `REVALIDATE_SECRET` | مشترک با Laravel |

---

## 5. Nginx (fashio.ir)

```bash
sudo cp deploy/nginx/fashio.conf /etc/nginx/sites-available/fashio.conf
sudo ln -sf /etc/nginx/sites-available/fashio.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d fashio.ir -d www.fashio.ir -d cdn.fashio.ir
```

فایل `fashio.conf` فقط `fashio.ir` و `cdn.fashio.ir` را عمومی می‌کند؛ Laravel روی `127.0.0.1:8010` گوش می‌دهد.

---

## 6. Queue Workers (Supervisor)

```bash
sudo cp deploy/supervisor/bahram-queue.conf /etc/supervisor/conf.d/
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl status bahram-queue:*
```

---

## 7. Laravel Scheduler (Cron)

```bash
sudo crontab -u www-data -e
# اضافه کنید:
* * * * * cd /var/www/bahram-cm/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 8. Deploy بعدی (به‌روزرسانی)

```bash
cd /var/www/bahram-cm
chmod +x deploy/scripts/deploy.sh deploy/scripts/backup.sh
./deploy/scripts/deploy.sh
```

---

## 9. Backup روزانه

```bash
# Cron root یا www-data:
0 3 * * * /var/www/bahram-cm/deploy/scripts/backup.sh
```

---

## 10. Post-deploy checklist

1. `/admin/cache` → پریست **حداکثر سرعت**
2. Arvan CDN Cache Rules — [`ARVAN-CDN.md`](ARVAN-CDN.md)
3. `GET /up` روی `127.0.0.1:8010` → 200 (Laravel داخلی)
4. `GET https://fashio.ir` → 200 (Next.js)
5. `GET https://fashio.ir/api/articles` → 200 (از همان دامنه)
6. Submit فرم → reCAPTCHA + ردیف در DB
7. `/sitemap.xml` کامل لود شود
8. Queue workers در Supervisor: `RUNNING`
9. Redis: `redis-cli ping` → `PONG`
10. Backup تست‌شده
11. Monitoring فعال (Sentry / uptime)

جزئیات CDN: [`ARVAN-CDN.md`](ARVAN-CDN.md)

---

*آخرین به‌روزرسانی: ۱۴۰۵/۰۴/۲۰*
