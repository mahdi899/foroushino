---
name: راه‌اندازی SSL و Nginx سرور جدید
overview: راه‌اندازی کامل Nginx dual-domain (rostami.app + rostami.club)، صدور SSL با Certbot به روش webroot، و پیکربندی PM2 برای Next.js (:3000) و پنل Flutter مدیر خانواده (:7358) روی سرور جدید 193.228.90.175.
todos:
  - id: ssh-retry
    content: تلاش مجدد اتصال SSH به 193.228.90.175 (بهرام + فامیلی)
    status: completed
  - id: repo-sync
    content: clone/pull ریپو bahram-cm در /var/www/foroushino و symlink بک‌اند
    status: completed
  - id: run-setup
    content: اجرای setup-origin-ssl.sh (nginx+certbot+pm2+flutter build) روی سرور بهرام
    status: in_progress
  - id: health-check-bahram
    content: تایید نهایی سرور بهرام با curl و pm2 list
    status: pending
  - id: sat-ssh
    content: اتصال SSH به سرور سات (185.130.50.24) و بررسی وضعیت فعلی
    status: completed
  - id: sat-bootstrap
    content: اجرای bootstrap-server.sh و deploy.sh پروژه saat روی سرور جدا
    status: pending
  - id: sat-ssl
    content: صدور SSL برای sat.center با certbot --nginx
    status: completed
  - id: health-check-sat
    content: تایید نهایی sat.center (وب + /api/v1/health + /version.json)
    status: completed
isProject: false
---

# راه‌اندازی سرور جدید (193.228.90.175)

## وضعیت فعلی
فایل‌های زیر در ریپو از قبل آماده شده‌اند (در چت قبلی ساخته شدند):

- [bahram-cm/deploy/nginx/rostami-app.conf](bahram-cm/deploy/nginx/rostami-app.conf) — vhost `rostami.app` (پروکسی به Next.js `:3000`)
- [bahram-cm/deploy/nginx/rostami-club.conf](bahram-cm/deploy/nginx/rostami-club.conf) — vhost `rostami.club` (`/family/*` → `:3000`, `/admin/*` → `:7358`)
- [bahram-cm/deploy/nginx/snippets/acme-webroot.conf](bahram-cm/deploy/nginx/snippets/acme-webroot.conf) — مسیر ACME challenge
- [bahram-cm/deploy/nginx/conf.d/rostami-upstreams.conf](bahram-cm/deploy/nginx/conf.d/rostami-upstreams.conf) — upstream جدید `rostami_family_admin:7358`
- [bahram-cm/deploy/pm2/ecosystem.config.cjs](bahram-cm/deploy/pm2/ecosystem.config.cjs) — دو اپ PM2: `bahram-frontend` (:3000) و `family-manager-web` (:7358)
- [bahram-cm/deploy/scripts/setup-origin-ssl.sh](bahram-cm/deploy/scripts/setup-origin-ssl.sh) — اسکریپت یک‌جا: نصب پکیج، صدور SSL webroot، نصب vhost، build فلاتر، اجرای PM2
- [bahram-family-manager/scripts/build-web-production.sh](bahram-family-manager/scripts/build-web-production.sh) — build فلاتر با `--base-href=/admin/`

**مانع فعلی:** از محیط IDE فعلی (پشت Cloudflare WARP) پورت ۲۲ سرور `193.228.90.175` قابل دسترسی نیست (ping و TCP هر دو timeout).

## کاری که با تایید شما انجام می‌شود

1. تلاش مجدد برای اتصال SSH به `193.228.90.175` (ممکن است این‌بار در دسترس باشد یا کاربر شبکه/فایروال را باز کرده باشد).
2. اگر متصل شد:
   - بررسی وضعیت فعلی سرور (نصب بودن nginx/php/node/git، وجود `/var/www/foroushino`)
   - clone یا pull ریپو در `/var/www/foroushino` + symlink `/var/www/bahram-cm`
   - اجرای `deploy/scripts/setup-origin-ssl.sh` که:
     - پکیج‌های nginx، php8.3-fpm، certbot، nodejs، pm2 را نصب/بروزرسانی می‌کند
     - یک vhost موقت HTTP-only برای ACME بالا می‌آورد
     - با `certbot certonly --webroot` گواهی SSL برای هر دو دامنه (`rostami.app` + subdomains، `rostami.club` + subdomains) با ایمیل `shokspy@gmail.com` صادر می‌کند
     - vhost نهایی (443) را نصب و nginx را reload می‌کند
     - Flutter admin panel را build می‌کند (`--base-href=/admin/`)
     - PM2 را برای هر دو پورت (3000, 7358) استارت و save می‌کند
     - cron برای renew خودکار certbot ثبت می‌کند
   - health-check نهایی: `curl -I https://rostami.app`, `https://rostami.club`, `https://rostami.club/admin/`, `pm2 list`
3. اگر متصل نشد: به شما گزارش می‌دهم که هنوز دسترسی SSH برقرار نیست و باید از سمت سرور/فایروال بررسی شود.

## پیش‌نیاز از سمت شما (قبل یا بعد از اجرا)
- DNS در Cloudflare: `rostami.app`, `www`, `cdn`, `rostami.club`, `www`, `family-cdn` باید به `193.228.90.175` اشاره کنند.
- پورت‌های 80 و 443 در فایروال VPS باز باشند.
- بعد از صدور موفق SSL: در Cloudflare حالت SSL/TLS را روی **Full (strict)** بگذارید.

## نکته امنیتی
رمز root که در چت فرستاده شد را بعد از اولین ورود عوض کنید (`passwd`).

---

# سرور دوم و کاملاً مجزا — Saat (sat.center) — 185.130.50.24

این سرور از سرور بهرام/فامیلی **کاملاً جداست** — فقط از طریق API با بک‌اند bahram-cm ارتباط می‌گیرد (توکن مشترک `@RostamiAppBot` برای تایید `initData` مینی‌اپ تلگرام؛ **هیچ webhook خودش ثبت نمی‌کند**).

مرجع: [saat/deploy/DEPLOYMENT.md](saat/deploy/DEPLOYMENT.md)

## معماری Saat
```
https://sat.center/              → frontend/dist (SPA — Vite/React)
https://sat.center/api/v1/*      → Laravel PHP-FPM (همین ریپو saat/backend)
https://sat.center/storage/*     → Laravel public storage
/var/www/mini-call-center/       → git clone monorepo
/var/www/saat → symlink به .../saat
```

## مراحل اجرا (بعد از تایید SSH)

1. اتصال SSH با `root@185.130.50.24`
2. بررسی وضعیت فعلی سرور (نصب بودن nginx/php/mysql/redis/node، وجود `/var/www/mini-call-center`)
3. اگر خام است — clone مونوریپوی saat + bootstrap:
   ```bash
   export REPO_URL="<git-url-mini-call-center>"
   export DOMAIN=sat.center
   export SITE_URL=https://sat.center
   export TELEGRAM_BOT_TOKEN="<همان توکن @RostamiAppBot>"
   export TELEGRAM_BOT_USERNAME="RostamiAppBot"
   sudo -E bash /var/www/saat/deploy/scripts/bootstrap-server.sh
   ```
4. صدور SSL (این پروژه از روش nginx بجای webroot استفاده می‌کند — طبق مستندات خودش، نه پشت CDN):
   ```bash
   sudo certbot --nginx -d sat.center -d www.sat.center --email shokspy@gmail.com --agree-tos --non-interactive
   ```
5. تنظیم `backend/.env`: `APP_URL=https://sat.center`, `SANCTUM_STATEFUL_DOMAINS`, `SESSION_DOMAIN=.sat.center`, `DEV_LOGIN_ENABLED=false`, `DEMO_OTP_ENABLED=false`, `TELEGRAM_BOT_TOKEN` مشترک
6. دیپلوی کامل:
   ```bash
   cd /var/www/saat && ./deploy/scripts/deploy.sh all
   ```
7. health-check:
   ```bash
   curl -s https://sat.center/version.json
   curl -s https://sat.center/api/v1/health
   ```

## نکته مهم — عدم تصادم Webhook
`TELEGRAM_BOT_TOKEN` مشترک با bahram-cm است، اما webhook فقط از سمت **bahram-cm** (`rostami.app`) ثبت می‌شود. روی سرور Saat هرگز دستور `telegram:webhook:set` اجرا نمی‌شود.

## سوالی که باید قبل از bootstrap مشخص شود
- آدرس دقیق ریپوی `mini-call-center` (یا آیا از همین ریپوی فعلی `foroushino/saat` استفاده می‌شود؟)
- `TELEGRAM_BOT_TOKEN` واقعی را از کجا تامین کنم (باید از شما یا از `.env` موجود bahram-cm گرفته شود، هرگز در کد commit نشود)

## پیش‌نیاز از سمت شما
- DNS: `sat.center` و `www.sat.center` → `185.130.50.24` (این دامنه پشت CDN نیست — DNS مستقیم)
- پورت 80/443 باز باشد روی این سرور جدا
