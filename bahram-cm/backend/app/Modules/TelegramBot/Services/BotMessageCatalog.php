<?php

namespace App\Modules\TelegramBot\Services;

use App\Jobs\PushTelegramHostSyncJob;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramBotMessage;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;
use Illuminate\Support\Facades\Cache;

class BotMessageCatalog
{
    /** @deprecated Use defaults() — kept for isset() BC in admin handlers. */
    public const DEFAULTS = [];

    /**
     * Built at runtime so premium emoji tags stay consistent.
     *
     * @return array<string, array{label: string, category: string, body: string}>
     */
    public static function defaults(): array
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache;
        }

        $e = static fn (string $key): string => TelegramCustomEmoji::tag($key);

        $nl = "\n";

        $cache = [
            'welcome' => [
                'label' => 'خوش‌آمدگویی /start',
                'category' => 'ثبت‌نام',
                'body' => $e('wave').' <b>سلام، به آکادمی بهرام خوش آمدید!</b>'.$nl.$nl
                    .'اینجا می‌توانید دوره‌ها را ببینید، ثبت‌نام کنید و با پشتیبانی در ارتباط باشید.'.$nl
                    .'از منوی پایین شروع کنید '.$e('point_up'),
            ],
            'main_menu_hint' => [
                'label' => 'راهنمای منوی اصلی',
                'category' => 'منو',
                'body' => $e('home').' <b>منوی آکادمی بهرام</b>'.$nl.$nl
                    .$e('graduation').' دوره‌ها'.$nl
                    .$e('mic').' سمینارها'.$nl
                    .$e('bell').' سات'.$nl
                    .$e('support').' پشتیبانی'.$nl.$nl
                    .'هر بخش را از دکمه‌های پایین انتخاب کنید '.$e('fire'),
            ],
            'sticker_welcome' => [
                'label' => 'استیکر خوش‌آمد (file_id)',
                'category' => 'منو',
                'body' => '',
            ],
            'menu_btn_courses' => [
                'label' => 'دکمه منو: دوره‌ها',
                'category' => 'منو دکمه‌ها',
                'body' => 'دوره‌ها',
            ],
            'menu_btn_seminars' => [
                'label' => 'دکمه منو: سمینارها',
                'category' => 'منو دکمه‌ها',
                'body' => 'سمینارها',
            ],
            'menu_btn_sat' => [
                'label' => 'دکمه منو: سات',
                'category' => 'منو دکمه‌ها',
                'body' => 'سات',
            ],
            'menu_btn_channel' => [
                'label' => 'دکمه منو: کانال مرجع',
                'category' => 'منو دکمه‌ها',
                'body' => 'کانال مرجع',
            ],
            'menu_btn_family' => [
                'label' => 'دکمه منو: خانواده',
                'category' => 'منو دکمه‌ها',
                'body' => 'خانواده',
            ],
            'menu_btn_referral' => [
                'label' => 'دکمه منو: معرفی دوستان',
                'category' => 'منو دکمه‌ها',
                'body' => 'معرفی دوستان',
            ],
            'menu_btn_support' => [
                'label' => 'دکمه منو: پشتیبانی',
                'category' => 'منو دکمه‌ها',
                'body' => 'پشتیبانی',
            ],
            'menu_btn_account' => [
                'label' => 'دکمه منو: حساب کاربری',
                'category' => 'منو دکمه‌ها',
                'body' => 'حساب من',
            ],
            'menu_btn_admin' => [
                'label' => 'دکمه منو: پنل ادمین بات',
                'category' => 'منو دکمه‌ها',
                'body' => 'پنل ادمین',
            ],
            'registration_ask_mobile' => [
                'label' => 'درخواست شماره موبایل',
                'category' => 'ثبت‌نام',
                'body' => $e('phone').' <b>تأیید شماره موبایل</b>'.$nl.$nl
                    .'برای ادامه ثبت‌نام، شماره ایران خود را بفرستید.'.$nl.$nl
                    .$e('point_up').' فقط از دکمه <b>ارسال شماره تماس</b> استفاده کنید.',
            ],
            'registration_ask_name' => [
                'label' => 'درخواست نام',
                'category' => 'ثبت‌نام',
                'body' => $e('pen').' <b>نام و نام خانوادگی</b>'.$nl.$nl
                    .'لطفاً نام کامل خود را بنویسید.'.$nl
                    .$e('check').' فقط حروف فارسی یا انگلیسی (۲ تا ۶۰ کاراکتر).',
            ],
            'registration_complete' => [
                'label' => 'ثبت‌نام کامل شد',
                'category' => 'ثبت‌نام',
                'body' => $e('check').' <b>ثبت‌نام شما انجام شد</b>'.$nl.$nl.'به جمع آکادمی خوش آمدید '.$e('party').$nl.'منوی پایین همیشه در دسترس است.',
            ],
            'purchase_need_course' => [
                'label' => 'نیاز به خرید دوره (کمپین و …)',
                'category' => 'خرید',
                'body' => $e('lock').' <b>دسترسی محدود</b>'.$nl.$nl.'برای ورود به این بخش باید یکی از دوره‌ها را تهیه کنید.'.$nl.'از دکمه <b>دوره‌ها</b> در منو می‌توانید ادامه دهید.',
            ],
            'purchase_catalog_empty' => [
                'label' => 'کاتالوگ خالی',
                'category' => 'خرید',
                'body' => $e('empty').' <b>هنوز دوره‌ای فعال نیست</b>'.$nl.$nl.'به‌زودی دوره‌های جدید اضافه می‌شوند. از پشتیبانی هم می‌توانید بپرسید.',
            ],
            'courses_catalog_intro' => [
                'label' => 'مقدمه لیست دوره‌ها',
                'category' => 'خرید',
                'body' => $e('graduation').' <b>دوره‌های فعال آکادمی</b>'.$nl.$nl.'بنر هر دوره را ببینید، جزئیات را بخوانید و با یک ضربه خرید کنید '.$e('fire'),
            ],
            'seminars_catalog_intro' => [
                'label' => 'مقدمه لیست سمینارها',
                'category' => 'خرید',
                'body' => $e('mic').' <b>سمینارهای پیش‌رو</b>'.$nl.$nl.'زمان، مکان و ظرفیت را ببینید و ثبت‌نام کنید '.$e('rocket'),
            ],
            'seminars_catalog_empty' => [
                'label' => 'سمینار خالی',
                'category' => 'خرید',
                'body' => $e('empty').' <b>سمیناری برای نمایش نیست</b>'.$nl.$nl.'فعلاً سمینار فعالی نداریم. به‌زودی رویدادهای جدید اینجا می‌آید.',
            ],
            'support_prompt' => [
                'label' => 'شروع پشتیبانی',
                'category' => 'پشتیبانی',
                'body' => $e('support').' <b>پشتیبانی آکادمی</b>'.$nl.$nl.'موضوع را انتخاب کنید، بعد پیامتان را بفرستید — ما سریع پیگیری می‌کنیم.',
            ],
            'support_message_received' => [
                'label' => 'تأیید دریافت پیام پشتیبانی',
                'category' => 'پشتیبانی',
                'body' => $e('check').' <b>پیام شما ثبت شد</b>'.$nl.$nl.'به‌زودی پاسخ می‌دهیم. ممنون از صبر شما '.$e('heart'),
            ],
            'support_category_purchase' => [
                'label' => 'دسته پشتیبانی: خرید',
                'category' => 'پشتیبانی',
                'body' => 'خرید و پرداخت',
            ],
            'support_category_campaign_course' => [
                'label' => 'دسته پشتیبانی: کمپین',
                'category' => 'پشتیبانی',
                'body' => 'دوره و آموزش',
            ],
            'support_category_sat' => [
                'label' => 'دسته پشتیبانی: سات',
                'category' => 'پشتیبانی',
                'body' => 'سات',
            ],
            'support_category_other' => [
                'label' => 'دسته پشتیبانی: سایر',
                'category' => 'پشتیبانی',
                'body' => 'سایر موضوعات',
            ],
            'error_forced_join' => [
                'label' => 'خطای عضویت اجباری',
                'category' => 'خطا',
                'body' => $e('channel').' <b>عضویت الزامی</b>'.$nl.$nl.'برای ادامه باید در کانال/گروه‌های اعلام‌شده عضو شوید.',
            ],
            'error_payment_failed' => [
                'label' => 'خطای پرداخت',
                'category' => 'خطا',
                'body' => $e('cross').' <b>پرداخت ناموفق بود</b>'.$nl.$nl.'دوباره تلاش کنید یا از پشتیبانی کمک بگیرید.',
            ],
            'error_generic' => [
                'label' => 'خطای عمومی',
                'category' => 'خطا',
                'body' => $e('warning').' <b>مشکلی پیش آمد</b>'.$nl.$nl.'لطفاً دوباره تلاش کنید. اگر ادامه داشت، پشتیبانی در دسترس است.',
            ],
        ];

        return $cache;
    }

    public function get(TelegramBot|int $bot, string $key, ?string $fallback = null): string
    {
        $botId = $bot instanceof TelegramBot ? (int) $bot->id : (int) $bot;
        $defaults = self::defaults()[$key]['body'] ?? ($fallback ?? $key);

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

    public function stickerFileId(TelegramBot|int $bot, string $key = 'sticker_welcome'): ?string
    {
        $raw = trim($this->get($bot, $key, ''));
        if ($raw === '' || str_contains($raw, ' ')) {
            return null;
        }

        return $raw;
    }

    /** @param  array<string, mixed>  $extra
     * @return array<string, mixed> */
    public function htmlOptions(array $extra = []): array
    {
        return array_merge(['parse_mode' => 'HTML'], $extra);
    }

    public function set(TelegramBot $bot, string $key, string $body): TelegramBotMessage
    {
        $meta = self::defaults()[$key] ?? ['label' => $key, 'category' => 'سایر'];
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

        if ($bot->key === 'production') {
            PushTelegramHostSyncJob::bootstrap();
        }

        return $row;
    }

    public function reset(TelegramBot $bot, string $key): void
    {
        TelegramBotMessage::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('message_key', $key)
            ->delete();

        Cache::forget($this->cacheKey((int) $bot->id, $key));

        if ($bot->key === 'production') {
            PushTelegramHostSyncJob::bootstrap();
        }
    }

    public function resetAllToDefaults(TelegramBot $bot): void
    {
        foreach (array_keys(self::defaults()) as $key) {
            if (str_starts_with($key, 'menu_btn_') || $key === 'sticker_welcome') {
                $this->set($bot, $key, self::defaults()[$key]['body']);

                continue;
            }
            $this->set($bot, $key, self::defaults()[$key]['body']);
        }
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
        foreach (self::defaults() as $key => $meta) {
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
