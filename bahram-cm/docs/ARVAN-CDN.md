# راهنمای CDN — fashio.ir + ابر آروان

## معماری (الزامی)

```
کاربر → Arvan CDN → fashio.ir (Nginx → Next.js :3000)
                         ↓ server-side فقط
                    127.0.0.1:8010 Laravel
                         ↓
                    cdn.fashio.ir → /storage, /cdn (رسانه)
```

### قوانین مهم

1. **دامنه عمومی:** فقط `https://fashio.ir` — مرورگر همه `/api/*` را از همین origin می‌گیرد (Next.js proxy).
2. **Laravel عمومی نیست:** `api.fashio.ir` یا IP مستقیم را **باز نکنید** — در ایران فیلتر/بلاک می‌شود.
3. **ارتباط داخلی:** `BACKEND_PROXY_URL=http://127.0.0.1:8010` (یا شبکه private).
4. **رسانه:** `https://cdn.fashio.ir` پشت Arvan — فقط فایل استاتیک.

---

## متغیرهای Production

### Frontend (`.env.local` روی سرور)

```env
NEXT_PUBLIC_SITE_URL=https://fashio.ir
NEXT_PUBLIC_API_BASE_URL=https://fashio.ir
BACKEND_PROXY_URL=http://127.0.0.1:8010
NEXT_PUBLIC_CDN_ORIGIN=https://cdn.fashio.ir
REVALIDATE_SECRET=<random-64>

# Google reCAPTCHA v3 (مخفی)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<site-key>
```

### Backend (`.env`)

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://127.0.0.1:8010
FRONTEND_URL=https://fashio.ir
CORS_ALLOWED_ORIGINS=https://fashio.ir
MEDIA_URL=https://cdn.fashio.ir
SESSION_DRIVER=redis
CACHE_STORE=redis
QUEUE_CONNECTION=redis
TRUSTED_PROXIES=127.0.0.1

RECAPTCHA_SITE_KEY=<site-key>
RECAPTCHA_SECRET_KEY=<secret-key>
RECAPTCHA_SCORE_THRESHOLD=0.5

# Purge کش Arvan (اختیاری)
ARVAN_API_KEY=
ARVAN_DOMAIN=fashio.ir
```

---

## تنظیمات Arvan Cloud

### ۱. DNS

| رکورد | نوع | مقدار |
|--------|-----|--------|
| `@` | A/CNAME | IP سرور origin |
| `cdn` | A/CNAME | همان IP |
| `www` | CNAME | `fashio.ir` |

### ۲. SSL

- گواهی Arvan یا Let's Encrypt روی origin
- حالت SSL: Full (strict) اگر origin گواهی معتبر دارد

### ۳. Cache Rules (پیشنهادی)

| مسیر | کش | TTL |
|------|-----|-----|
| `/_next/static/*` | بله | ۱ سال |
| `/fonts/*`, `/icons/*` | بله | ۱ سال |
| `/cdn/*`, `/storage/*` روی cdn.fashio.ir | بله | ۱ سال |
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

فایل آماده: [`deploy/nginx/fashio.conf`](../deploy/nginx/fashio.conf)

```bash
sudo cp deploy/nginx/fashio.conf /etc/nginx/sites-available/fashio.conf
sudo ln -sf /etc/nginx/sites-available/fashio.conf /etc/nginx/sites-enabled/
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

- [ ] `curl -I https://fashio.ir` → 200
- [ ] `curl -I https://fashio.ir/api/articles` → 200 (از همان دامنه)
- [ ] `curl -I http://YOUR_SERVER_IP:8010/api/articles` از خارج → **timeout/refused**
- [ ] `curl -I https://cdn.fashio.ir/storage/media/site/logo.svg` → 200
- [ ] reCAPTCHA در فرم تماس / چت‌بات کار می‌کند
- [ ] `/admin/cache` → پریست «حداکثر سرعت»
