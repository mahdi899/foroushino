# Deployment Guide — Bahram CM

این راهنما deploy **Next.js** (`frontend/`) و **Laravel** (`backend/`) را شرح می‌دهد.

**CDN و Cloudflare:** [`CDN-DEPLOYMENT.md`](CDN-DEPLOYMENT.md)

CI در `.github/workflows/ci.yml` lint، typecheck و build را اجرا می‌کند.

---

## 1. پیش‌نیازها

- Node.js 20+
- PHP 8.2+، Composer
- MySQL + Redis
- (اختیاری) Cloudflare برای edge CDN
- (اختیاری) Plausible / GA4

---

## 2. Frontend (`frontend/`)

### Environment

کپی `.env.example` → `.env.local` (dev) یا تنظیم در هاست:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | yes | URL عمومی سایت/API |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | URL کانونیکال SEO |
| `BACKEND_PROXY_URL` | yes | Origin Laravel برای proxy |
| `NEXT_PUBLIC_CDN_ORIGIN` | yes | Origin تصاویر resize |
| `REVALIDATE_SECRET` | yes | Webhook ISR (مشترک با Laravel) |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` | no | Plausible |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | no | GA4 |

### Build & run

```bash
cd frontend
npm ci
npm run verify
npm run build
npm start
```

**Vercel:** root = `bahram-cm/frontend`، env vars را اضافه کنید.

---

## 3. Backend (`backend/`)

```bash
cd backend
cp .env.example .env
composer install
php artisan migrate
php artisan db:seed --class=CacheIntegrationsSeeder
php artisan serve --host=0.0.0.0 --port=8010
```

متغیرهای مهم:

| Variable | Purpose |
| --- | --- |
| `APP_URL` | URL عمومی Laravel |
| `FRONTEND_URL` | URL Next.js (purge + sitemap) |
| `MEDIA_URL` | URL CDN رسانه |
| `REVALIDATE_SECRET` | مشترک با Next |
| `REVALIDATE_WEBHOOK_URL` | `{SITE}/api/revalidate` |
| `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_API_TOKEN` | Purge edge |
| `CACHE_STORE=redis` | Object cache |

---

## 4. Post-deploy checklist

1. `/admin/cache` → پریست **متعادل** یا **حداکثر سرعت**
2. Cloudflare Cache Rules — [`cloudflare-cache-rules.example.json`](cloudflare-cache-rules.example.json)
3. Submit Apply / Newsletter → ردیف در DB
4. `/sitemap.xml` و `/insights/{slug}` درست لود شوند
5. ذخیره مقاله → HTML به‌روز (ISR + Cloudflare purge)
6. Badge **Cloudflare → OK** در پنل کش

جزئیات CDN: [`CDN-DEPLOYMENT.md`](CDN-DEPLOYMENT.md)

---

*آخرین به‌روزرسانی: ۱۴۰۵/۰۴/۱۷*
