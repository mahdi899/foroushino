# Telegram Host App (external cPanel host — PHP 8.3)

اپ مستقل PHP برای دریافت مستقیم وب‌هوک تلگرام روی هاست خارج. **منو، کاتالوگ، ثبت‌نام و عضویت اجباری از MySQL محلی**؛ سرور ایران فقط OTP، پرداخت، ادمین و push سینک را انجام می‌دهد.

## معماری

```
Telegram → public/webhook.php → UpdateRouter
                                   ├─ کاربر تأییدشده → handlers محلی (منو، کاتالوگ، خرید، پشتیبانی، ثبت‌نام)
                                   └─ پنل ادمین / گروه‌ها → relay به سرور ایران
Iran → public/host-sync.php → bootstrap / catalog / account push (embedded payload)
```

جزئیات کامل در [ARCHITECTURE.md](ARCHITECTURE.md).

## نصب روی cPanel

1. کل پوشه `telegram/` را آپلود کنید.
2. اسکیمای `db/schema.sql` را یک‌بار در phpMySQL import کنید.
3. `config.sample.php` → `config.php` (از پنل ادمین سایت).
4. Document Root → `telegram/public`
5. **Cron توصیه‌شده** — هر دقیقه `php cron/drain.php` برای تخلیه صف‌های پس‌زمینه (ثبت‌نام، پشتیبانی، relay ایران).

   ```
   * * * * * /usr/local/bin/php /home/USER/telegram/cron/drain.php >> /home/USER/telegram/storage/cron-drain.log 2>&1
   ```

6. `pull_sync_enabled` پیش‌فرض `false`؛ فقط برای بازیابی اضطراری کش خالی: `php cron/pull-sync.php --force`
7. در پنل ادمین: حالت «هاست خارج» + ثبت webhook

**آپلود نکنید:** `config.php` لوکال، پوشه `scripts/telegram-local/`، فایل‌های `storage/*.lock`.

اگر پنل با timeout به `host-sync.php` خورد:  
`public/register-webhook.php?token=<webhook_secret>`

### بررسی cron تخلیه صف (مهم)

صف‌های پس‌زمینه (ثبت‌نام، revoke پرداخت، پشتیبانی، بروزرسانی حساب) فقط وقتی سریع خالی می‌شوند که cron هر دقیقه اجرا شود.

1. در cPanel → **Cron Jobs** ببینید خطی شبیه این ثبت شده باشد:
   ```
   * * * * * /usr/local/bin/php /home/USER/telegram/cron/drain.php >> /home/USER/telegram/storage/cron-drain.log 2>&1
   ```
   (مسیر `php` و پوشه `telegram` را با هاست خودتان عوض کنید.)
2. فایل `telegram/storage/cron-drain.log` را باز کنید — باید هر دقیقه خطی مثل `drain ok — processed=...` ببینید.
3. اگر log خالی است یا قدیمی است، cron را اضافه/فعال کنید؛ بدون آن فقط drain محدود بعد از هر webhook (`webhook_drain_per_queue`) کار می‌کند.

## قابلیت‌ها

| بخش | اجرا |
|-----|------|
| ثبت‌نام (قوانین، OTP، نام) | هاست محلی + API OTP ایران |
| عضویت اجباری کانال | هاست (`getChatMember` + کش TTL) |
| منوی ۹ دکمه‌ای | هاست محلی |
| خرید + تخفیف + زرین‌پال / کارت‌به‌کارت | هاست + API زنده ایران |
| پشتیبانی (متن + رسانه) | هاست (`HostSupportService`) |
| سات / خانواده / معرفی | کش snapshot + API زنده |
| پنل ادمین | relay همزمان به ایران |
| سینک کاتالوگ/اکانت | push از ایران (نه pull از host-sync) |

## امنیت

- توکن ربات، `webhook_secret`, `host_sync_token` فقط در `config.php` (gitignored)
- کلید زرین‌پال و SMS هرگز به هاست خارج نمی‌رود
- ارتباط sync/live: HTTPS + `Authorization: Bearer` + `X-Proxy-Origin`

## فایل‌های مهم

| فایل | نقش |
|------|-----|
| `public/webhook.php` | ورود webhook |
| `public/host-sync.php` | push از ایران |
| `src/Routing/UpdateRouter.php` | مسیریابی local vs relay |
| `src/Handlers/MessageHandler.php` | منو و خرید |
| `ARCHITECTURE.md` | جزئیات API |
