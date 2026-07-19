# Worker تلگرام

1. در پنل `/admin/telegram/settings` حالت **Worker** را انتخاب کنید.
2. **کپی worker.js** — فایل آماده با دامنه و توکن‌ها.
3. در Cloudflare Workers → **Quick Edit** → Paste → **Deploy**.
4. آدرس Worker را در پنل بگذارید → **ذخیره** → **ثبت وب‌هوک**.

Webhook:
`https://<worker>.workers.dev/api/v1/integrations/telegram/production/webhook`

پشتیبانی: متن، عکس، ویدیو، صدا، فایل، استیکر و callback.
