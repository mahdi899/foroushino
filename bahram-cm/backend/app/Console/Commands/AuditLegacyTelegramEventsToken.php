<?php

namespace App\Console\Commands;

use App\Models\SmsProvider;
use App\Modules\TelegramBot\Models\TelegramBot;
use Illuminate\Console\Command;

/**
 * One-off audit: previously, admin "events" notifications (order/ticket/student logs)
 * were sent using a separate Telegram bot token stored on the `telegram` SmsProvider
 * row. That is no longer used — AdminTelegramLogService now always sends through the
 * single, unified site bot (`telegram_bots` where key=production).
 *
 * This command just reports whether an old, different token was configured, so an
 * admin can double check that the chats configured in "چت‌های گیرنده رویدادها" are
 * also members of the unified bot (since messages now come from that bot's username).
 */
class AuditLegacyTelegramEventsToken extends Command
{
    protected $signature = 'telegram:audit-legacy-events-token';

    protected $description = 'Report whether the old separate "events bot" token differs from the unified site bot token.';

    public function handle(): int
    {
        $provider = SmsProvider::query()->where('slug', 'telegram')->first();
        $legacyToken = trim((string) $provider?->credentials);

        $bot = TelegramBot::query()->where('key', 'production')->first();
        $unifiedToken = trim((string) $bot?->resolveToken());

        if ($legacyToken === '') {
            $this->info('توکن جدا برای ربات رویدادها تنظیم نشده بود — چیزی برای مهاجرت نیست.');

            return self::SUCCESS;
        }

        if ($unifiedToken === '') {
            $this->error('توکن ربات یکپارچه (production) تنظیم نشده. رویدادها ارسال نخواهند شد تا توکن ربات اصلی ثبت شود.');

            return self::FAILURE;
        }

        if ($legacyToken === $unifiedToken) {
            $this->info('توکن قدیمی ربات رویدادها همان توکن ربات یکپارچه است — نیازی به کاری نیست.');

            return self::SUCCESS;
        }

        $this->warn('توجه: قبلاً یک توکن جدا برای «ربات رویدادها» تنظیم شده بود که با توکن ربات یکپارچه سایت فرق دارد.');
        $this->line('از این پس، پیام‌های رویدادها از طریق همان ربات یکپارچه سایت (@'.($bot?->username ?? '—').') ارسال می‌شود.');
        $this->line('لطفاً مطمئن شوید چت(های) گیرنده رویدادها عضو همین ربات هستند، وگرنه پیام‌ها دریافت نمی‌شوند.');
        $this->line('برای بررسی/تغییر چت‌ها: پنل ادمین > تلگرام > رویدادها، یا داخل خود ربات > پنل ادمین > 📡 رویدادها.');

        return self::SUCCESS;
    }
}
