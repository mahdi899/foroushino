# راهنمای CDN — rostami.app + ابر آروان

> **توجه:** پیش‌فرض جدید پروژه **Cloudflare** است. برای راه‌اندازی Cloudflare به [`CLOUDFLARE-CDN.md`](CLOUDFLARE-CDN.md) مراجعه کنید. این سند فقط برای استقرار با آروان نگه‌داری می‌شود.

## معماری (الزامی)

```
کاربر → Arvan CDN → rostami.app (Nginx → Next.js :3000)
                         ↓ server-side فقط
                    127.0.0.1:8010 Laravel
                         ↓
                    cdn.rostami.app → /storage, /cdn (رسانه)
```

### قوانین مهم

1. **دامنه عمومی:** فقط `https://rostami.app` — مرورگر همه `/api/*` را از همین origin می‌گیرد (Next.js proxy).
2. **Laravel عمومی نیست:** `api.rostami.app` یا IP مستقیم را **باز نکنید** — در ایران فیلتر/بلاک می‌شود.
3. **ارتباط داخلی:** `BACKEND_PROXY_URL=http://127.0.0.1:8010` (یا شبکه private).
4. **رسانه:** `https://cdn.rostami.app` پشت Arvan — فقط فایل استاتیک.

---

## متغیرهای Production

### Frontend (`.env.local` روی سرور)

```env
NEXT_PUBLIC_SITE_URL=https://rostami.app
NEXT_PUBLIC_API_BASE_URL=https://rostami.app
BACKEND_PROXY_URL=http://127.0.0.1:8010
NEXT_PUBLIC_CDN_ORIGIN=https://cdn.rostami.app
REVALIDATE_SECRET=<random-64>

# Google reCAPTCHA v3 (مخفی)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site-key>
```

### Backend (`.env`)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://127.0.0.1:8010
FRONTEND_URL=https://rostami.app
CORS_ALLOWED_ORIGINS=https://rostami.app
MEDIA_URL=https://cdn.rostami.app
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
TRUSTED_PROXIES=127.0.0.1

RECAPTCHA_SITE_KEY=<site-key>
RECAPTCHA_SECRET_KEY=<secret-key>
RECAPTCHA_SCORE_THRESHOLD=0.5

# Purge کش Arvan (اختیاری)
ARVAN_API_KEY=
ARVAN_DOMAIN=rostami.app
```

---

## تنظیمات Arvan Cloud

### ۱. DNS

| رکورد | نوع | مقدار |
|--------|-----|--------|
| `@` | A/CNAME | IP سرور origin |
| `cdn` | A/CNAME | همان IP |
| `www` | CNAME | `rostami.app` |

### ۲. SSL

- گواهی Arvan یا Let's Encrypt روی origin
- حالت SSL: Full (strict) اگر origin گواهی معتبر دارد

### ۳. Cache Rules (پیشنهادی)

| مسیر | کش | TTL |
|------|-----|-----|
| `/_next/static/*` | بله | ۱ سال |
| `/fonts/*`, `/icons/*` | بله | ۱ سال |
| `/cdn/*`, `/storage/*` روی cdn.rostami.app | بله | ۱ سال |
| `/api/*` | **خیر** | — |
| HTML (`/`, `/insights/*`, …) | بله | طبق `CDN-Cache-Control` از Next |

### ۴. مسیرهای Bypass (هرگز کش نشوند)

```
/api/chatbot*
/api/captcha*
/api/revalidate*
/api/admin*
/api/orders*
/api/payments*
/panel/*
/cart
/purchase/*
```

### ۵. هدرهای Origin

Next.js و Laravel هدر `CDN-Cache-Control` می‌فرستند — در Arvan «Respect origin headers» را فعال کنید.

---

## Nginx

فایل آماده: [`deploy/nginx/rostami-app-origin.conf`](../deploy/nginx/rostami-app-origin.conf)

```bash
sudo cp deploy/nginx/rostami-app-origin.conf /etc/nginx/sites-available/rostami-app.conf
sudo ln -sf /etc/nginx/sites-available/rostami-app.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

### ۵. Purge کش از پنل ادمین

**تنظیمات سایت** → `#cache-integrations`:

1. **ارائه‌دهنده فعال:** ابر آروان / Cloudflare / غیرفعال
2. اعتبارنامه همان ارائه‌دهنده (API Key آروان یا Zone+Token کلادفلر)
3. **تست اتصال** قبل از ذخیره

**کش و عملکرد** → فعال کردن «پاک‌سازی خودکار CDN»

> سوییچ بین آروان و Cloudflare: فقط ارائه‌دهنده را عوض کنید و اعتبارنامه طرف مقابل را از قبل آماده نگه دارید.

---

## چک‌لیست بعد از Deploy

- [ ] `curl -I https://rostami.app` → 200
- [ ] `curl -I https://rostami.app/api/articles` → 200 (از همان دامنه)
- [ ] `curl -I http://YOUR_SERVER_IP:8010/api/articles` از خارج → **timeout/refused**
- [ ] `curl -I https://cdn.rostami.app/storage/media/site/logo.svg` → 200
- [ ] reCAPTCHA در فرم تماس / چت‌بات کار می‌کند
- [ ] `/admin/cache` → پریست «حداکثر سرعت»
