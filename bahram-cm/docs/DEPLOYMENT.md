# Deployment Guide — Bahram CM (Ubuntu Self-hosted)

این راهنما deploy **Next.js** (`frontend/`) و **Laravel** (`backend/`) روی **Ubuntu + Nginx + PHP-FPM + PM2 + Redis + MySQL** را شرح می‌دهد.

**معماری: Option B — دو دامنه واقعی (true dual-domain)**

| دامین | نقش |
|---|---|
| `rostami.app` | سایت اصلی، پنل دانشجو (`/panel`)، پنل ادمین (`/admin`)، ربات (لینک‌ها)، webhook تلگرام |
| `cdn.rostami.app` | رسانه سایت (Cloudflare CDN) |
| `rostami.club` | خانواده داداش بهرام — PWA مستقل (apex) |
| `family-cdn.rostami.club` | رسانه خانواده (FTP + CDN) |
| `sat.center` | سات — پروژه **جداگانه** (`saat/`)، همان بات تلگرام را برای Mini App استفاده می‌کند — [`saat/deploy/DEPLOYMENT.md`](../../saat/deploy/DEPLOYMENT.md) |

هر دو دامنهٔ `rostami.app` و `rostami.club` توسط **همان یک** پردازش Next.js (PM2, پورت 3000) و **همان یک** بک‌اند Laravel (127.0.0.1:8010) سرویس می‌شوند — فقط nginx بر اساس Host تفکیک می‌کند. `middleware.ts` مسیر `/` روی `rostami.club` را داخلی به `/family` بازنویسی می‌کند، و `/family` روی `rostami.app` / `/panel`، `/admin` روی `rostami.club` را با یک هندشیک SSO یک‌بارمصرف به دامنه درست ریدایرکت می‌کند (`app/sso/bridge/route.ts` + بک‌اند `SsoBridgeController`).

**فایل‌های زیرساخت:** [`deploy/`](../deploy/)
**مهاجرت به IP/سرور جدید:** [`SERVER-MIGRATION.md`](SERVER-MIGRATION.md)
**CDN Cloudflare:** [`CLOUDFLARE-CDN.md`](CLOUDFLARE-CDN.md) — جایگزین آروان: [`ARVAN-CDN.md`](ARVAN-CDN.md)
**خانواده داداش بهرام (Family):** [`FAMILY.md`](FAMILY.md) — متغیرهای محیطی، صف رسانه، FTP+CDN
**تلگرام:** [`../backend/docs/TELEGRAM_BOT.md`](../backend/docs/TELEGRAM_BOT.md)

CI در `.github/workflows/ci.yml` lint، typecheck، build و PHPUnit را اجرا می‌کند.

---

## 1. پیش‌نیازهای سرور

| نرم‌افزار | نسخه |
|-----------|------|
| Ubuntu | 22.04 LTS یا 24.04 LTS |
| Node.js | 20 LTS |
| PHP | 8.4+ (extensions: mbstring, xml, curl, mysql, redis, gd, intl, zip, bcmath, **ftp**) |
| Composer | 2.x |
| MySQL | 8.0+ |
| Redis | 7.x |
| Nginx | 1.24+ |
| PM2 | `npm i -g pm2` |
| Supervisor | `apt install supervisor` |
| Certbot | SSL (Let's Encrypt) |

سریع‌ترین راه: `sudo bash deploy/scripts/bootstrap-server.sh` انجام تمام مراحل ۱ تا ۷ + nginx dual-domain + supervisor + webhook تلگرام را خودکار می‌کند. بخش‌های زیر برای راه‌اندازی دستی/گام‌به‌گام است.

```bash
sudo apt update && sudo apt install -y nginx php8.4-fpm php8.4-mysql php8.4-redis \
  php8.4-mbstring php8.4-xml php8.4-curl php8.4-gd php8.4-intl php8.4-zip php8.4-bcmath php8.4-ftp \
  mysql-server redis-server supervisor certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### افزونه PHP: FTP (`ext-ftp`)

کتابخانه رسانه و انتقال فایل به **هاست دانلود** (پنل ادمین → گالری) و صف رسانه خانواده از درایور Flysystem FTP استفاده می‌کنند؛ بدون `ext-ftp` تست اتصال FTP در پنل با خطا مواجه می‌شود.

**Ubuntu (production):** پکیج `php8.4-ftp` را نصب کنید (در دستور بالا هست) و PHP-FPM را ری‌استارت کنید:

```bash
sudo apt install -y php8.4-ftp
sudo systemctl restart php8.4-fpm
php -m | grep -i ftp   # باید ftp چاپ شود
```

**Laragon (توسعه محلی):** در `php.ini` خط `extension=ftp` را بدون `;` فعال کنید، Laragon را Stop/Start کنید و `php artisan serve` را دوباره اجرا کنید (پروسس قدیمی افزونه‌های جدید را نمی‌بیند).

---

## 2. Clone و ساختار

```bash
sudo mkdir -p /var/www
sudo git clone <repo-url> /var/www/foroushino
sudo ln -sfn /var/www/foroushino/bahram-cm /var/www/bahram-cm
sudo chown -R www-data:www-data /var/www/foroushino
```

---

## 3. Backend (`backend/`)

```bash
cd /var/www/bahram-cm/backend
cp .env.example .env
# ویرایش .env — بخش PRODUCTION را ببینید (rostami.app + rostami.club)
composer install --no-dev --optimize-autoloader
php artisan key:generate
php artisan migrate --force
php artisan db:seed --class=CacheIntegrationsSeeder --force
php artisan db:seed --class=TelegramBotSeeder --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

### ⚠️ هرگز `DatabaseSeeder` کامل را در Production اجرا نکنید

`db:seed --class=DatabaseSeeder` یک ادمین با ایمیل/رمز شناخته‌شده (`admin@bahram.local` / `password`) و داده‌های آزمایشی (سفارش، سمینار، خانواده با رمز `12345`) می‌سازد — فقط برای local/staging. در production فقط `CacheIntegrationsSeeder` را اجرا کنید (بالا) و اولین ادمین واقعی را بسازید:

```bash
php artisan app:create-admin
# ایمیل / موبایل / نام را می‌پرسد؛ رمز به‌صورت پنهان (secret prompt) گرفته می‌شود — هیچ‌جا لاگ نمی‌شود.
```

### متغیرهای مهم Production

| Variable | مقدار |
|----------|----------------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `http://127.0.0.1:8010` (فقط داخلی — **نه** یک ساب‌دامین api.* عمومی؛ در ایران فیلتر می‌شود) |
| `FRONTEND_URL` | `https://rostami.app` |
| `PAYMENT_PUBLIC_BASE_URL` | *(اختیاری)* پیش‌فرض همان `FRONTEND_URL` — کال‌بک زرین‌پال: `{این}/api/payments/zarinpal/callback` |
| `CORS_ALLOWED_ORIGINS` | `https://rostami.app,https://rostami.club` |
| `SANCTUM_STATEFUL_DOMAINS` | `rostami.app,rostami.club` |
| `MEDIA_URL` | `https://cdn.rostami.app` |
| `FAMILY_ENTRY_BASE_URL` | `https://rostami.club` |
| `FAMILY_ENTRY_PATH` | *(خالی — apex، نه `/family`)* |
| `FAMILY_MEDIA_CDN_URL` | `https://family-cdn.rostami.club` |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_BOT_USERNAME` | مشترک با Mini App سات — `@RostamiAppBot` |
| `TELEGRAM_WEBHOOK_BASE_URL` / `TELEGRAM_SITE_BASE_URL` | `https://rostami.app` |
| `CACHE_STORE` / `QUEUE_CONNECTION` / `SESSION_DRIVER` | `redis` |
| `SESSION_SECURE_COOKIE` | `true` |
| `OTP_DEV_MODE` | `false` |
| `LOG_LEVEL` | `warning` |
| `REVALIDATE_SECRET` | secret قوی تصادفی |
| `INTERNAL_API_SECRET` | secret جدا از REVALIDATE |
| `RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 |

> **مهم:** API عمومی جدا (`api.rostami.app`) باز نکنید. مرورگر فقط `https://rostami.app/api/*` یا `https://rostami.club/api/*` را صدا می‌زند؛ Next.js به `127.0.0.1:8010` پروکسی می‌کند. فقط دو مسیر مستقیم به PHP-FPM می‌روند (نه از Next): webhook تلگرام و آپلود رسانه مدیر خانواده — در `deploy/nginx/rostami-app.conf`.

---

## 4. Frontend (`frontend/`)

```bash
cd /var/www/bahram-cm/frontend
cp .env.example .env.local
# تنظیم env vars — شامل NEXT_PUBLIC_APP_DOMAIN و NEXT_PUBLIC_FAMILY_DOMAIN
npm ci
npm run verify
npm run build
pm2 start /var/www/bahram-cm/deploy/pm2/ecosystem.config.cjs
pm2 save
pm2 startup  # دستور systemd را اجرا کنید
```

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://rostami.app` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://rostami.app` (same-origin) |
| `BACKEND_PROXY_URL` | `http://127.0.0.1:8010` (داخلی) |
| `NEXT_PUBLIC_CDN_ORIGIN` | `https://cdn.rostami.app` |
| `NEXT_PUBLIC_APP_DOMAIN` | `rostami.app` — **الزامی برای dual-domain** |
| `NEXT_PUBLIC_FAMILY_DOMAIN` | `rostami.club` — **الزامی برای dual-domain** |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Google reCAPTCHA v3 |
| `REVALIDATE_SECRET` | مشترک با Laravel |

اگر `NEXT_PUBLIC_APP_DOMAIN`/`NEXT_PUBLIC_FAMILY_DOMAIN` خالی بمانند (مثلاً در local dev)، رفتار قدیمی/تک‌دامنه‌ای برمی‌گردد: `/family` فقط یک مسیر عادی روی همان origin است — بدون ریدایرکت یا SSO.

---

## 5. Nginx (rostami.app + rostami.club)

```bash
# Shared upstreams/maps — ONCE only (both vhosts use rostami_next / rostami_php)
sudo cp deploy/nginx/conf.d/rostami-upstreams.conf /etc/nginx/conf.d/rostami-upstreams.conf

# rostami.app (پشت Cloudflare CDN) — روی سرور مبدا از نسخه origin استفاده کنید:
sudo cp deploy/nginx/rostami-app-origin.conf /etc/nginx/sites-available/rostami-app.conf
sudo ln -sf /etc/nginx/sites-available/rostami-app.conf /etc/nginx/sites-enabled/

# rostami.club (خانواده) — TLS مستقیم روی همین سرور (یا Cloudflare جداگانه):
sudo cp deploy/nginx/rostami-club.conf /etc/nginx/sites-available/rostami-club.conf
sudo ln -sf /etc/nginx/sites-available/rostami-club.conf /etc/nginx/sites-enabled/

sudo nginx -t && sudo systemctl reload nginx

# SSL
sudo certbot --nginx -d rostami.app -d www.rostami.app -d cdn.rostami.app
sudo certbot --nginx -d rostami.club -d www.rostami.club -d family-cdn.rostami.club
```

نکته: `deploy/nginx/rostami-app.conf` (بدون `-origin`) نسخه‌ای است که خودش SSL می‌کند — برای Full (strict) با Cloudflare. **هرگز** `upstream` را دوباره داخل vhost تعریف نکنید — nginx با دو فایل فعال خطا می‌دهد.

---

## 6. Queue Workers (Supervisor)

```bash
sudo cp deploy/supervisor/bahram-queue.conf /etc/supervisor/conf.d/
sudo cp deploy/supervisor/bahram-family-queue.conf /etc/supervisor/conf.d/
sudo cp backend/deploy/supervisor-telegram-horizon.conf.example /etc/supervisor/conf.d/bahram-telegram-horizon.conf
sudo supervisorctl reread && sudo supervisorctl update
sudo supervisorctl status bahram-queue:* bahram-family-queue:* bahram-horizon bahram-scheduler
```

- `bahram-queue` — صف عمومی (سفارش، نوتیفیکیشن، ...).
- `bahram-family-queue` — صف اختصاصی خانواده (رسانه سنگین) — جزئیات در [`FAMILY.md`](FAMILY.md).
- `bahram-horizon` + `bahram-scheduler` — صف‌های ربات تلگرام (`telegram-inbound/replies/...`) و `schedule:run` بدون کرون.

---

## 7. Laravel Scheduler (Cron)

اگر `bahram-scheduler` (بالا، `artisan schedule:work`) را با Supervisor اجرا می‌کنید، کرون لازم نیست. در غیر این صورت:

```bash
sudo crontab -u www-data -e
# اضافه کنید:
* * * * * cd /var/www/bahram-cm/backend && php artisan schedule:run >> /dev/null 2>&1
```

---

## 8. Telegram Bot (@RostamiAppBot — مشترک با سات)

```bash
cd /var/www/bahram-cm/backend
php artisan telegram:sync-bots
php artisan telegram:webhook:set production
php artisan telegram:webhook:info production   # تأیید
```

webhook مستقیماً روی `https://rostami.app/api/v1/integrations/telegram/production/webhook` است (بدون ساب‌دامین جدا) — nginx این مسیر را مستقیم به PHP-FPM می‌فرستد (نه Next.js)، جزئیات در `deploy/nginx/rostami-app.conf`.

Mini App سات (`t.me/RostamiAppBot/satcenter`) از **همین بات و توکن** استفاده می‌کند اما webhook خودش را ثبت نمی‌کند — فقط initData را با همان token تأیید می‌کند. جزئیات: [`../../saat/deploy/DEPLOYMENT.md`](../../saat/deploy/DEPLOYMENT.md)

---

## 9. مهاجرت به سرور / IP جدید

ریستارت ساده با مهاجرت فرق دارد. برای انتقال کامل (بک‌آپ، restore، DNS، SSL) راهنمای گام‌به‌گام:

→ **[`SERVER-MIGRATION.md`](SERVER-MIGRATION.md)**

ارتقای PHP روی سرور فعلی (8.3 → 8.4):

```bash
sudo bash deploy/scripts/upgrade-php-8.4.sh
```

---

## 10. Deploy بعدی (به‌روزرسانی)

```bash
cd /var/www/bahram-cm
chmod +x deploy/scripts/deploy.sh deploy/scripts/backup.sh
./deploy/scripts/deploy.sh
```

---

## 11. Backup روزانه

```bash
# Cron root — DB هر شب، media هفتگی (یک‌شنبه)، نگهداری ۳۰ روز:
0 3 * * * /var/www/bahram-cm/deploy/scripts/backup.sh
```

راهنمای کامل: [`docs/BACKUP-AND-RECOVERY.md`](../../docs/BACKUP-AND-RECOVERY.md)

---

## 12. Post-deploy checklist

1. `/admin/cache` → پریست **حداکثر سرعت**
2. Cloudflare Cache Rules — [`CLOUDFLARE-CDN.md`](CLOUDFLARE-CDN.md) + [`cloudflare-cache-rules.example.json`](cloudflare-cache-rules.example.json)
3. `GET /up` روی `127.0.0.1:8010` → 200 (Laravel داخلی)
4. `GET https://rostami.app` → 200 (Next.js، سایت اصلی)
5. `GET https://rostami.club` → 200 (همان Next.js، rewrite داخلی به `/family`)
6. `GET https://rostami.app/api/articles` → 200 (از همان دامنه)
7. کلیک روی «خانواده» در ناوبری سایت اصلی → ریدایرکت به `rostami.club` بدون نیاز به لاگین دوباره (SSO bridge)
8. `/family` روی `rostami.app` → ریدایرکت 30x به `rostami.club`
9. `/panel` یا `/admin` روی `rostami.club` → ریدایرکت 30x به `rostami.app`
10. Submit فرم → reCAPTCHA + ردیف در DB
11. `/sitemap.xml` کامل لود شود
12. Queue workers در Supervisor: همه `RUNNING`
13. Redis: `redis-cli ping` → `PONG`
14. `php -m | grep -i ftp` → `ftp` (هاست دانلود رسانه و صف FTP خانواده)
15. `php artisan telegram:webhook:info production` → `url` درست است
16. اولین ادمین واقعی با `php artisan app:create-admin` ساخته شده (نه seeder)
17. Backup تست‌شده
18. Monitoring فعال (Sentry / uptime)

جزئیات CDN: [`ARVAN-CDN.md`](ARVAN-CDN.md)

---

*آخرین به‌روزرسانی: Option B — دو دامنه واقعی (rostami.app + rostami.club)*
