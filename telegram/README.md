# Telegram Host App (external cPanel host — PHP 8.3)

اپ مستقل PHP برای دریافت مستقیم وب‌هوک تلگرام روی هاست خارج. اکثر پاسخ‌ها از MySQL محلی می‌آیند؛ فقط OTP، پرداخت، تیکت و عملیات حساس به سرور ایران وصل می‌شوند.

## معماری

```
Telegram → public/webhook.php → UpdateRouter
                                   ├─ کاربر تأییدشده → handlers محلی (سریع)
                                   └─ ثبت‌نام / ادمین / C2C / SAT / پشتیبانی → delegate به سرور ایران
```

## نصب روی cPanel

1. کل پوشه `telegram/` را آپلود کنید.
2. اسکیمای `db/schema.sql` را import کنید (اگر قبلاً ساخته‌اید: `db/migrate-catalog-photos.sql`).
3. `config.sample.php` → `config.php` (از پنل ادمین سایت).
4. Document Root → `telegram/public`
5. Cron هر ۵ دقیقه: `php cron/pull-sync.php`
6. یک‌بار دستی: `php cron/pull-sync.php`
7. در پنل ادمین: حالت «هاست خارج» + ثبت webhook

## قابلیت‌های کامل

| بخش | اجرا |
|-----|------|
| ثبت‌نام (قوانین، OTP، نام) | سرور ایران (delegate) |
| منوی ۹ دکمه‌ای | هاست محلی |
| خرید + تخفیف + زرین‌پال | هاست + API زنده |
| کارت‌به‌کارت + رسید | سرور ایران (state مشترک) |
| پشتیبانی (متن + رسانه + reply) | سرور ایران |
| سات / خانواده / معرفی | API زنده |
| پنل ادمین + گروه‌ها | سرور ایران |
| عضویت اجباری کانال | هاست (getChatMember) |
| عکس دوره/سمینار | کش + sendPhoto |

## امنیت

- توکن ربات، `webhook_secret`, `hmac_secret`, `aes_key` فقط در `config.php` (gitignored)
- کلید زرین‌پال و SMS هرگز به هاست خارج نمی‌رود
- HMAC-SHA256 + AES-256-GCM روی همه تماس‌های sync/live

## فایل‌های مهم

| فایل | نقش |
|------|-----|
| `public/webhook.php` | ورود webhook |
| `src/Routing/UpdateRouter.php` | مسیریابی local vs delegate |
| `src/Handlers/MessageHandler.php` | منو و خرید کاربران |
| `cron/pull-sync.php` | همگام‌سازی کش |
| `ARCHITECTURE.md` | جزئیات API |
