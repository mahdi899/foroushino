<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramBotMessage;
use Illuminate\Support\Facades\Cache;

class BotMessageCatalog
{
    /** Default user-facing copy (key => [label, category, body]). */
    public const DEFAULTS = [
        'welcome' => [
            'label' => 'خوش‌آمدگویی /start',
            'category' => 'ثبت‌نام',
            'body' => "سلام! به ربات خوش آمدید.\nبرای شروع از منوی پایین استفاده کنید.",
        ],
        'main_menu_hint' => [
            'label' => 'راهنمای منوی اصلی',
            'category' => 'منو',
            'body' => 'از دکمه‌های منوی پایین یکی را انتخاب کنید.',
        ],
        'registration_ask_mobile' => [
            'label' => 'درخواست شماره موبایل',
            'category' => 'ثبت‌نام',
            'body' => 'لطفاً شماره موبایل خود را ارسال کنید یا دکمه اشتراک‌گذاری شماره را بزنید.',
        ],
        'registration_ask_name' => [
            'label' => 'درخواست نام',
            'category' => 'ثبت‌نام',
            'body' => 'لطفاً نام و نام خانوادگی خود را بنویسید.',
        ],
        'registration_complete' => [
            'label' => 'ثبت‌نام کامل شد',
            'category' => 'ثبت‌نام',
            'body' => '✅ ثبت‌نام شما با موفقیت انجام شد.',
        ],
        'purchase_need_course' => [
            'label' => 'نیاز به خرید دوره (کمپین و …)',
            'category' => 'خرید',
            'body' => "برای دسترسی به این بخش باید دوره را تهیه کنید.\nاز منوی خرید می‌توانید ادامه دهید.",
        ],
        'purchase_catalog_empty' => [
            'label' => 'کاتالوگ خالی',
            'category' => 'خرید',
            'body' => 'در حال حاضر محصولی برای نمایش وجود ندارد.',
        ],
        'support_prompt' => [
            'label' => 'شروع پشتیبانی',
            'category' => 'پشتیبانی',
            'body' => 'موضوع پشتیبانی را انتخاب کنید، سپس پیام خود را بفرستید.',
        ],
        'support_message_received' => [
            'label' => 'تأیید دریافت پیام پشتیبانی',
            'category' => 'پشتیبانی',
            'body' => '✅ پیام شما ثبت شد. به‌زودی پاسخ می‌دهیم.',
        ],
        'support_category_purchase' => [
            'label' => 'دسته پشتیبانی: خرید',
            'category' => 'پشتیبانی',
            'body' => 'خرید و پرداخت',
        ],
        'support_category_campaign_course' => [
            'label' => 'دسته پشتیبانی: کمپین',
            'category' => 'پشتیبانی',
            'body' => 'دوره کمپین‌نویسی',
        ],
        'support_category_sat' => [
            'label' => 'دسته پشتیبانی: سات',
            'category' => 'پشتیبانی',
            'body' => 'سات',
        ],
        'support_category_other' => [
            'label' => 'دسته پشتیبانی: سایر',
            'category' => 'پشتیبانی',
            'body' => 'سایر',
        ],
        'error_forced_join' => [
            'label' => 'خطای عضویت اجباری',
            'category' => 'خطا',
            'body' => 'برای ادامه باید در کانال/گروه‌های الزامی عضو شوید.',
        ],
        'error_payment_failed' => [
            'label' => 'خطای پرداخت',
            'category' => 'خطا',
            'body' => 'پرداخت ناموفق بود. دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.',
        ],
        'error_generic' => [
            'label' => 'خطای عمومی',
            'category' => 'خطا',
            'body' => 'خطایی رخ داد. لطفاً دوباره تلاش کنید.',
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
