# سیاست مسیر تصاویر (ثابت — تغییر ندهید)

این سند قانون رسمی پروژه برای URL تصاویر است. **هیچ‌وقت** این قوانین را دور نزنید و مسیر تصاویر را «بهینه‌سازی» یا «تبدیل» نکنید.

## قانون اصلی

تصاویر همیشه با **مسیر خام** لود می‌شوند:

```
/storage/media/YYYY/MM/filename.webp
```

یا در صورت نیاز، همان مسیر با origin عمومی (مثلاً `NEXT_PUBLIC_MEDIA_URL`):

```
https://cdn.example.com/storage/media/YYYY/MM/filename.webp
```

## ممنوع — هرگز استفاده نکنید

| ممنوع | چرا |
|--------|-----|
| `/cdn/media/...?w=...&q=...` | resize سمت سرور با query string |
| `/_next/image?url=...&w=...` | پروکسی Next.js برای رسانهٔ Laravel |
| افزودن `?w=` یا `?q=` به URL تصویر | پارامترهای تحویل — ممنوع |
| ذخیره URL مطلق CDN در دیتابیس | فقط مسیر portable |

اگر در Network تب مرورگر `cdn/media` با `w` و `q` دیدید، یعنی کسی این سیاست را نقض کرده است.

## مجاز — همیشه از این‌ها استفاده کنید

| کار | تابع / کامپوننت |
|-----|------------------|
| نمایش در سایت عمومی | `AppImage` / `SiteImage` (مسیر خام از loader) |
| `<img>` مستقیم | `DirectMediaImg` |
| ساخت `src` برای `<img>` یا preload | `primarySiteImageSrc()` یا `resolveMediaUrl()` |
| ذخیره در دیتابیس / HTML | `persistMediaUrl()` → همیشه `/storage/...` |
| Loader مربوط به `next/image` | `lib/imageLoader.ts` — فقط `primarySiteImageSrc` |

## جریان داده

```
دیتابیس          →  /storage/media/site/hero.webp     (portable)
نمایش در مرورگر  →  /storage/media/site/hero.webp     (همان مسیر خام)
پروکسی dev       →  localhost:3000/storage/...        → Laravel
```

پروکسی `/storage/*` در `middleware.ts` فقط برای dev/prod است؛ **مسیر را عوض نمی‌کند**.

## فایل‌های حساس — دست نزنید مگر با دلیل خیلی مشخص

- `frontend/lib/imageLoader.ts` — فقط مسیر خام
- `frontend/lib/mediaUrl.ts` — `primarySiteImageSrc`, `persistMediaUrl`, `resolveMediaUrl`
- `frontend/components/ui/DirectMediaImg.tsx`
- `frontend/components/ui/AppImage.tsx`

## چک‌لیست قبل از PR

- [ ] هیچ `?w=` یا `?q=` روی URL تصویر نیست
- [ ] هیچ redirect به `/cdn/media` برای نمایش عمومی نیست
- [ ] دیتابیس فقط `/storage/...` ذخیره می‌کند
- [ ] تست دستی: Network → تصاویر با `/storage/media/...` بدون query

## سوالات متداول

**چرا resize نمی‌کنیم؟**  
فایل‌ها در گالری از قبل بهینه می‌شوند. مسیر ساده = کش ساده + دیباگ ساده + بدون باگ URL.

**`next/image` چطور؟**  
`loader: custom` با `imageLoader.ts` — خروجی loader همان مسیر خام است، نه `/_next/image`.

**ادمین گالری؟**  
`DirectMediaImg` با `admin` — باز هم `/storage/...` مستقیم.

---

**خلاصه یک خطی:** مسیر تصویر = `/storage/media/...` خام. تمام.
