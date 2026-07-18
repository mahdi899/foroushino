# Saat (سات) — Production deploy on sat.center

دامین: **https://sat.center**
فرانت: وب + تلگرام مینی‌اپ (همان origin)
API: همان دامنه از مسیر `/api` → Laravel

بات مشترک اکوسیستم: **[@RostamiAppBot](https://t.me/RostamiAppBot)** (همان بات سایت اصلی `rostami.app`)
مینی‌اپ: **Sat Center** — short name `satcenter` — لینک مستقیم `https://t.me/RostamiAppBot/satcenter`

---

## معماری

```
https://sat.center/              → frontend/dist (SPA)
https://sat.center/version.json  → never cached (سیستم آپدیت)
https://sat.center/api/v1/*      → Laravel PHP-FPM (این پروژه)
https://sat.center/storage/*     → Laravel public storage
```

مسیر روی سرور:

```
/var/www/mini-call-center/   # git clone monorepo
/var/www/saat → symlink به .../saat
```

---

## بات تلگرام مشترک

بات `@RostamiAppBot` توسط **bahram-cm** (سایت اصلی `rostami.app`) مدیریت می‌شود:
webhook، دستورات، لینک‌سازی همه از آن سمت است.

سات فقط **توکن همان بات** را برای تایید `initData` مینی‌اپ لازم دارد — و
**هیچ webhook ثبت نمی‌کند**. اگر سات webhook ثبت کند، با bahram-cm تصادم می‌کنند
(هر بات فقط یک webhook می‌تواند داشته باشد).

```env
# saat/backend/.env — NEVER commit the real token; inject via server env / secrets
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=RostamiAppBot
```

BotFather (یک‌بار، از قبل انجام شده):

1. `/newapp` روی `@RostamiAppBot` → نام: **Sat Center**، short name: `satcenter`
2. Web App URL: `https://sat.center/`
3. لینک نهایی: `https://t.me/RostamiAppBot/satcenter`

اگر Web App URL تغییر کرد: `@BotFather` → `/myapps` → `Sat Center` → Edit Web App URL.

---

## سیستم آپدیت حرفه‌ای (مثل dating app)

| لایه | رفتار |
|------|--------|
| Build | `vite-plugin-version` → `public/version.json` + `__APP_BUILD_HASH__` |
| وب | `useAppVersion` هر ۱۵ دقیقه `/version.json` را چک می‌کند → `UpdateBanner` (forced / optional / silent) |
| تلگرام | در `index.html` قبل از React: sync XHR به `version.json` و redirect با `?_tg=<buildHash>` |
| Nginx | `version.json` و `index.html` → `Cache-Control: no-store` |
| PWA | `version.json` → NetworkOnly |

نوع آپدیت در بیلد:

```bash
VITE_UPDATE_TYPE=optional npm run build   # پیش‌فرض — بنر قابل رد
VITE_UPDATE_TYPE=forced   npm run build   # اجباری
VITE_UPDATE_TYPE=silent   npm run build   # بدون UI
```

بعد از بیلد لینک تلگرام:

```bash
cd frontend && npm run telegram:link
```

---

## راه‌اندازی اول (bootstrap)

```bash
# روی سرور Ubuntu
export REPO_URL="https://github.com/YOUR_ORG/mini-call-center.git"
export DOMAIN=sat.center
export SITE_URL=https://sat.center
# Inject from secrets manager / paste at deploy time — do not hardcode in git
export TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_FROM_BOTFATHER"
export TELEGRAM_BOT_USERNAME="RostamiAppBot"
sudo -E bash /var/www/saat/deploy/scripts/bootstrap-server.sh

# SSL
sudo certbot --nginx -d sat.center -d www.sat.center
```

سپس در `backend/.env` (بوت‌استرپ این‌ها را خودکار می‌نویسد، فقط تایید کنید):

```env
APP_URL=https://sat.center
SANCTUM_STATEFUL_DOMAINS=sat.center,www.sat.center
SESSION_DOMAIN=.sat.center
DEV_LOGIN_ENABLED=false
DEMO_OTP_ENABLED=false
TELEGRAM_BOT_TOKEN=   # set on server only
TELEGRAM_BOT_USERNAME=RostamiAppBot
```

فرانت production (معمولاً همان‌origin، بدون `VITE_API_BASE_URL`):

```bash
cp frontend/.env.production.example frontend/.env.production
```

---

## دیپلوی روزمره

```bash
# فول دیپلوی (بکاپ + migrate + build + health)
cd /var/www/saat
./deploy/scripts/deploy.sh all

# فقط فرانت / فقط بک‌اند
./deploy/scripts/deploy.sh frontend
./deploy/scripts/deploy.sh backend

# آپدیت سریع بر اساس diff آخرین کامیت
./deploy/scripts/update.sh

# سلامت
./deploy/scripts/deploy.sh health

# رولبک
./deploy/scripts/deploy.sh rollback
```

بعد از دیپلوی چک کنید:

```bash
curl -s https://sat.center/version.json
curl -s https://sat.center/api/v1/health
```

---

## DNS

| Record | Value |
|--------|--------|
| A `@` | IP سرور |
| A `www` | IP سرور (یا CNAME به `@`) |

---

## چک‌لیست لانچ

- [ ] DNS `sat.center` → سرور
- [ ] SSL (certbot)
- [ ] `backend/.env` production + `TELEGRAM_BOT_TOKEN` مشترک
- [ ] `DEMO_OTP` / `DEV_LOGIN` خاموش
- [ ] Nginx از `deploy/nginx/sat-center.conf`
- [ ] Supervisor `saat-queue`
- [ ] `./deploy/scripts/deploy.sh all` موفق
- [ ] وب: `https://sat.center` باز می‌شود
- [ ] مینی‌اپ `t.me/RostamiAppBot/satcenter` همان صفحه را باز می‌کند
- [ ] `/version.json` بدون کش برمی‌گردد
- [ ] بنر آپدیت بعد از بیلد جدید روی وب دیده می‌شود
- [ ] webhook بات فقط روی bahram-cm (rostami.app) ثبت شده — نه اینجا
