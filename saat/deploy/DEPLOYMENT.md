# Saat (سات) — Production deploy on satcall.ir

دامین: **https://satcall.ir**  
فرانت: وب + تلگرام مینی‌اپ (همان origin)  
API: همان دامنه از مسیر `/api` → Laravel

---

## معماری

```
https://satcall.ir/           → frontend/dist (SPA)
https://satcall.ir/version.json  → never cached (سیستم آپدیت)
https://satcall.ir/api/v1/*   → Laravel PHP-FPM
https://satcall.ir/storage/*  → Laravel public storage
```

مسیر روی سرور:

```
/var/www/mini-call-center/   # git clone monorepo
/var/www/saat → symlink به .../saat
```

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
export DOMAIN=satcall.ir
export SITE_URL=https://satcall.ir
sudo bash /var/www/saat/deploy/scripts/bootstrap-server.sh

# SSL
sudo certbot --nginx -d satcall.ir -d www.satcall.ir
```

سپس در `backend/.env`:

```env
APP_URL=https://satcall.ir
SANCTUM_STATEFUL_DOMAINS=satcall.ir,www.satcall.ir
SESSION_DOMAIN=.satcall.ir
DEV_LOGIN_ENABLED=false
DEMO_OTP_ENABLED=false
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
```

فرانت production (معمولاً همان‌origin، بدون `VITE_API_BASE_URL`):

```bash
cp frontend/.env.production.example frontend/.env.production
```

---

## BotFather (مینی‌اپ)

1. `@BotFather` → بات سات
2. Menu Button / Configure Mini App → Web App URL: `https://satcall.ir`
3. `/setdomain` → `satcall.ir`
4. توکن را در `TELEGRAM_BOT_TOKEN` بگذارید

وب و مینی‌اپ هر دو همان URL را باز می‌کنند.

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
curl -s https://satcall.ir/version.json
curl -s https://satcall.ir/api/v1/health
```

---

## DNS

| Record | Value |
|--------|--------|
| A `@` | IP سرور |
| A `www` | IP سرور (یا CNAME به `@`) |

---

## چک‌لیست لانچ

- [ ] DNS `satcall.ir` → سرور
- [ ] SSL (certbot)
- [ ] `backend/.env` production + Telegram token
- [ ] `DEMO_OTP` / `DEV_LOGIN` خاموش
- [ ] Nginx از `deploy/nginx/satcall.conf`
- [ ] Supervisor `saat-queue`
- [ ] `./deploy/scripts/deploy.sh all` موفق
- [ ] وب: `https://satcall.ir` باز می‌شود
- [ ] مینی‌اپ در تلگرام همان URL را باز می‌کند
- [ ] `/version.json` بدون کش برمی‌گردد
- [ ] بنر آپدیت بعد از بیلد جدید روی وب دیده می‌شود
