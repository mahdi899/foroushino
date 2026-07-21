<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramBotMessage;
use Illuminate\Support\Facades\Cache;

class BotMessageCatalog
{
    /** Default user-facing copy (key => [label, category, body]). HTML allowed except menu_btn_*. */
    public const DEFAULTS = [
        'welcome' => [
            'label' => 'خوش‌آمدگویی /start',
            'category' => 'ثبت‌نام',
            'body' => "🌟 <b>سلام، به آکادمی بهرام خوش آمدید!</b>\n\nاینجا می‌توانید دوره‌ها را ببینید، ثبت‌نام کنید و با پشتیبانی در ارتباط باشید.\nاز منوی پایین شروع کنید 👇",
        ],
        'main_menu_hint' => [
            'label' => 'راهنمای منوی اصلی',
            'category' => 'منو',
            'body' => "🏠 <b>منوی آکادمی بهرام</b>\n\nدوره‌ها، سمینارها، سات و پشتیبانی از دکمه‌های پایین در دسترس‌اند.\nهر بخش را که می‌خواهید انتخاب کنید 👇",
        ],
        'sticker_welcome' => [
            'label' => 'استیکر خوش‌آمد (file_id)',
            'category' => 'منو',
            'body' => '',
        ],
        'menu_btn_courses' => [
            'label' => 'دکمه منو: دوره‌ها',
            'category' => 'منو دکمه‌ها',
            'body' => 'دوره‌ها 🎓',
        ],
        'menu_btn_seminars' => [
            'label' => 'دکمه منو: سمینارها',
            'category' => 'منو دکمه‌ها',
            'body' => 'سمینارها 🎤',
        ],
        'menu_btn_sat' => [
            'label' => 'دکمه منو: سات',
            'category' => 'منو دکمه‌ها',
            'body' => 'سات ☎️',
        ],
        'menu_btn_channel' => [
            'label' => 'دکمه منو: کانال مرجع',
            'category' => 'منو دکمه‌ها',
            'body' => 'کانال مرجع 📣',
        ],
        'menu_btn_family' => [
            'label' => 'دکمه منو: خانواده',
            'category' => 'منو دکمه‌ها',
            'body' => 'خانواده 👨‍👩‍👧‍👦',
        ],
        'menu_btn_referral' => [
            'label' => 'دکمه منو: معرفی دوستان',
            'category' => 'منو دکمه‌ها',
            'body' => 'معرفی دوستان 🎁',
        ],
        'menu_btn_support' => [
            'label' => 'دکمه منو: پشتیبانی',
            'category' => 'منو دکمه‌ها',
            'body' => 'پشتیبانی 🎫',
        ],
        'menu_btn_account' => [
            'label' => 'دکمه منو: حساب کاربری',
            'category' => 'منو دکمه‌ها',
            'body' => 'حساب من 👤',
        ],
        'menu_btn_admin' => [
            'label' => 'دکمه منو: پنل ادمین بات',
            'category' => 'منو دکمه‌ها',
            'body' => 'پنل ادمین 🛠',
        ],
        'registration_ask_mobile' => [
            'label' => 'درخواست شماره موبایل',
            'category' => 'ثبت‌نام',
            'body' => "📱 <b>شماره موبایل</b>\n\nدکمه «ارسال شماره تماس» را بزنید یا شماره را تایپ کنید.",
        ],
        'registration_ask_name' => [
            'label' => 'درخواست نام',
            'category' => 'ثبت‌نام',
            'body' => "✍️ <b>نام و نام خانوادگی</b>\n\nلطفاً نام کامل خود را بنویسید.",
        ],
        'registration_complete' => [
            'label' => 'ثبت‌نام کامل شد',
            'category' => 'ثبت‌نام',
            'body' => "✅ <b>ثبت‌نام شما انجام شد</b>\n\nبه جمع آکادمی خوش آمدید 🎉\nمنوی پایین همیشه در دسترس است.",
        ],
        'purchase_need_course' => [
            'label' => 'نیاز به خرید دوره (کمپین و …)',
            'category' => 'خرید',
            'body' => "🔒 <b>دسترسی محدود</b>\n\nبرای ورود به این بخش باید یکی از دوره‌ها را تهیه کنید.\nاز دکمه <b>دوره‌ها</b> در منو می‌توانید ادامه دهید.",
        ],
        'purchase_catalog_empty' => [
            'label' => 'کاتالوگ خالی',
            'category' => 'خرید',
            'body' => "📭 <b>هنوز دوره‌ای فعال نیست</b>\n\nبه‌زودی دوره‌های جدید اضافه می‌شوند. از پشتیبانی هم می‌توانید بپرسید.",
        ],
        'courses_catalog_intro' => [
            'label' => 'مقدمه لیست دوره‌ها',
            'category' => 'خرید',
            'body' => "🎓 <b>دوره‌های فعال آکادمی</b>\n\nبنر هر دوره را ببینید، جزئیات را بخوانید و با یک ضربه خرید کنید.",
        ],
        'seminars_catalog_intro' => [
            'label' => 'مقدمه لیست سمینارها',
            'category' => 'خرید',
            'body' => "🎤 <b>سمینارهای پیش‌رو</b>\n\nزمان، مکان و ظرفیت را ببینید و ثبت‌نام کنید.",
        ],
        'seminars_catalog_empty' => [
            'label' => 'سمینار خالی',
            'category' => 'خرید',
            'body' => "📭 <b>سمیناری برای نمایش نیست</b>\n\nفعلاً سمینار فعالی نداریم. به‌زودی رویدادهای جدید اینجا می‌آید.",
        ],
        'support_prompt' => [
            'label' => 'شروع پشتیبانی',
            'category' => 'پشتیبانی',
            'body' => "🎫 <b>پشتیبانی آکادمی</b>\n\nموضوع را انتخاب کنید، بعد پیامتان را بفرستید — ما سریع پیگیری می‌کنیم.",
        ],
        'support_message_received' => [
            'label' => 'تأیید دریافت پیام پشتیبانی',
            'category' => 'پشتیبانی',
            'body' => "✅ <b>پیام شما ثبت شد</b>\n\nبه‌زودی پاسخ می‌دهیم. ممنون از صبر شما 🙏",
        ],
        'support_category_purchase' => [
            'label' => 'دسته پشتیبانی: خرید',
            'category' => 'پشتیبانی',
            'body' => '💳 خرید و پرداخت',
        ],
        'support_category_campaign_course' => [
            'label' => 'دسته پشتیبانی: کمپین',
            'category' => 'پشتیبانی',
            'body' => '🎓 دوره و آموزش',
        ],
        'support_category_sat' => [
            'label' => 'دسته پشتیبانی: سات',
            'category' => 'پشتیبانی',
            'body' => '☎️ سات',
        ],
        'support_category_other' => [
            'label' => 'دسته پشتیبانی: سایر',
            'category' => 'پشتیبانی',
            'body' => '💬 سایر موضوعات',
        ],
        'error_forced_join' => [
            'label' => 'خطای عضویت اجباری',
            'category' => 'خطا',
            'body' => "📢 <b>عضویت الزامی</b>\n\nبرای ادامه باید در کانال/گروه‌های اعلام‌شده عضو شوید.",
        ],
        'error_payment_failed' => [
            'label' => 'خطای پرداخت',
            'category' => 'خطا',
            'body' => "❌ <b>پرداخت ناموفق بود</b>\n\nدوباره تلاش کنید یا از پشتیبانی کمک بگیرید.",
        ],
        'error_generic' => [
            'label' => 'خطای عمومی',
            'category' => 'خطا',
            'body' => "⚠️ <b>مشکلی پیش آمد</b>\n\nلطفاً دوباره تلاش کنید. اگر ادامه داشت، پشتیبانی در دسترس است.",
        ],
    ];

    public function get(TelegramBot|int $bot, string $key, ?string $fallback = null): string
    {
        $botId = $bot instanceof TelegramBot ? (int) $bot->id : (int) $bot;
        $defaults = self::DEFAULTS[$key]['body'] ?? ($fallback ?? $key);

        $cached = Cache::remember($this->cacheKey($botId, $key), 60, function () use ($botId, $key) {
            return TelegramBotMessage::query()
                ->where('telegram_bot_id', $botId)
                ->where('message_key', $key)
                ->value('body');
        });

        if (is_string($cached) && trim($cached) !== '') {
            return $cached;
        }

        return $defaults;
    }

    /** Sticker/animation file_id from catalog (empty = skip). */
    public function stickerFileId(TelegramBot|int $bot, string $key = 'sticker_welcome'): ?string
    {
        $raw = trim($this->get($bot, $key, ''));
        if ($raw === '' || str_contains($raw, ' ')) {
            return null;
        }

        return $raw;
    }

    /**
     * Default HTML send options merged with caller extras.
     *
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public function htmlOptions(array $extra = []): array
    {
        return array_merge(['parse_mode' => 'HTML'], $extra);
    }

    public function set(TelegramBot $bot, string $key, string $body): TelegramBotMessage
    {
        $meta = self::DEFAULTS[$key] ?? ['label' => $key, 'category' => 'سایر'];
        $row = TelegramBotMessage::query()->updateOrCreate(
            [
                'telegram_bot_id' => $bot->id,
                'message_key' => $key,
            ],
            [
                'body' => $body,
                'label_fa' => $meta['label'] ?? $key,
                'category' => $meta['category'] ?? null,
            ],
        );

        Cache::forget($this->cacheKey((int) $bot->id, $key));

        return $row;
    }

    public function reset(TelegramBot $bot, string $key): void
    {
        TelegramBotMessage::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('message_key', $key)
            ->delete();

        Cache::forget($this->cacheKey((int) $bot->id, $key));
    }

    /**
     * @return list<array{key: string, label: string, category: string, body: string, is_custom: bool}>
     */
    public function listForBot(TelegramBot $bot): array
    {
        $customs = TelegramBotMessage::query()
            ->where('telegram_bot_id', $bot->id)
            ->get()
            ->keyBy('message_key');

        $rows = [];
        foreach (self::DEFAULTS as $key => $meta) {
            $custom = $customs->get($key);
            $rows[] = [
                'key' => $key,
                'label' => $meta['label'],
                'category' => $meta['category'],
                'body' => $custom?->body ?? $meta['body'],
                'is_custom' => $custom !== null,
            ];
        }

        return $rows;
    }

    private function cacheKey(int $botId, string $key): string
    {
        return "telegram_bot_msg:{$botId}:{$key}";
    }
}
