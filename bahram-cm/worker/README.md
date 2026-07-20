# Worker تلگرام

1. در پنل `/admin/telegram/settings` حالت **Worker** را انتخاب کنید.
2. **ذخیره** — سپس **کپی worker.js** (فایل آماده با دامنه و توکن‌ها).
3. در Cloudflare Workers → **Quick Edit** → Paste → **Deploy**.
4. آدرس Worker را در پنل بگذارید → **ذخیره** → **ثبت وب‌هوک**.

Webhook:
`https://<worker>.workers.dev/api/v1/integrations/telegram/production/webhook`

## چرا «ثبت وب‌هوک» خطا می‌دهد؟

| علت | راه‌حل |
|-----|--------|
| **api.telegram.org فیلتر است** (ایران) | حالت Worker را فعال کنید — سرور از طریق Worker به تلگرام وصل می‌شود؛ **VPN لازم نیست** اگر Worker درست Deploy شده باشد |
| Worker Deploy نشده یا توکن‌ها اشتباه | worker.js را از پنل کپی کنید؛ `PROXY_SHARED_TOKEN` و `TELEGRAM_WEBHOOK_SECRET` باید با پنل یکی باشند |
| توکن ربات خالی | در بخش ربات، توکن production را ذخیره کنید |
| Worker به سرور نمی‌رسد | `BACKEND_ORIGIN` باید `https://rostami.app` باشد و سرور از Cloudflare در دسترس باشد |

## دیدن جزئیات خطا

- **پنل:** بعد از «ثبت وب‌هوک» پیام قرمز زیر دکمه‌ها
- **سرور:** `tail -f bahram-cm/backend/storage/logs/telegram.log`
- **Cloudflare:** Workers → Logs (Real-time) — خطای 403 یعنی secret/token اشتباه؛ 502 یعنی Worker به سرور نرسیده

پشتیبانی: متن، عکس، ویدیو، صدا، فایل، استیکر و callback.
