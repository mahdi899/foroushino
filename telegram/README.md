# Telegram Host App (external cPanel host — PHP 8.3)

اپ مستقل PHP برای دریافت مستقیم وب‌هوک تلگرام روی هاست خارج. **منو و کاتالوگ از MySQL محلی**؛ **هیچ کرون جابی لازم نیست** — سرور ایران هنگام تغییر (پرداخت، حساب، کاتالوگ) به `host-sync.php` push می‌زند.

## معماری

```
Telegram → public/webhook.php → UpdateRouter
                                   ├─ کاربر تأییدشده → handlers محلی (منو، کاتالوگ، خرید، پشتیبانی)
                                   └─ ثبت‌نام / ادمین / C2C / SAT → delegate به سرور ایران
```

جزئیات کامل و به‌روز مسیریابی در [ARCHITECTURE.md](ARCHITECTURE.md).

## نصب روی cPanel

1. کل پوشه `telegram/` را آپلود کنید.
2. اسکیمای `db/schema.sql` را یک‌بار در phpMySQL import کنید (نصب تازه).
3. `config.sample.php` → `config.php` (از پنل ادمین سایت).
4. Document Root → `telegram/public`
5. **هیچ Cron Job در cPanel نگذارید** (نه pull-sync، نه iran-relay). همه‌چیز event-driven است.
6. نصب اول (اختیاری): یک‌بار `php cron/pull-sync.php --force` فقط اگر کش خالی است و موقتاً `pull_sync_enabled=true` گذاشته‌اید؛ بعد دوباره `false`.
7. در پنل ادمین: حالت «هاست خارج» + ثبت webhook

اگر پنل با timeout به `host-sync.php` خورد: روی هاست یک‌بار  
`public/register-webhook.php?token=<webhook_secret>` را باز کنید (همان secret در `config.php`).

## قابلیت‌های کامل

| بخش | اجرا |
|-----|------|
| ثبت‌نام (قوانین، OTP، نام) | سرور ایران (delegate)؛ آفلاین → ثبت‌نام محلی موقت |
| منوی ۹ دکمه‌ای | هاست محلی |
| پرداخت موفق → پیام «تأیید پرداخت» | فوری: ایران `push_account` + `notification` → هاست `sendMessage` |
| خرید + تخفیف + زرین‌پال | هاست + API زنده ایران |
| کارت‌به‌کارت + رسید | سرور ایران (state مشترک) |
| **پشتیبانی (متن + رسانه + reply)** | **کاملاً محلی روی هاست** (`HostSupportService` → فوروارد به گروه گزارشات + پاسخ ادمین) — بدون ایران |
| سات / خانواده / معرفی | API زنده (کش محلی به‌عنوان fallback) |
| پنل ادمین + گروه‌ها | سرور ایران (delegate synchronous؛ state محلی `admin_panel` نگه‌داری می‌شود تا فشارهای بعدی هم درست فوروارد شوند) |
| عضویت اجباری کانال | هاست (getChatMember) |
| عکس دوره/سمینار | کش + sendPhoto |

## امنیت

- توکن ربات، `webhook_secret`, `host_sync_token` فقط در `config.php` (gitignored)
- کلید زرین‌پال و SMS هرگز به هاست خارج نمی‌رود
- ارتباط sync/live: HTTPS + `Authorization: Bearer` (همان `host_sync_secret` روی سرور ایران) + `X-Proxy-Origin`

## فایل‌های مهم

| فایل | نقش |
|------|-----|
| `public/webhook.php` | ورود webhook |
| `src/Routing/UpdateRouter.php` | مسیریابی local vs delegate |
| `src/Handlers/MessageHandler.php` | منو و خرید کاربران |
| `cron/pull-sync.php` | همگام‌سازی کش |
| `ARCHITECTURE.md` | جزئیات API |
