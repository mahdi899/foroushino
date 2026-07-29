<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * Local admin panel shell — instant open/exit keyboard.
 * Data sections still sync-relay to Iran via DelegationDetector.
 */
final class HostAdminShell
{
    public const USERS = 'کاربران';

    public const ADMINS = 'ادمین‌ها';

    public const STATS = 'آمار';

    public const BROADCAST = 'پیام همگانی';

    public const REQUIRED_CHATS = 'کانال اجباری';

    public const DESTINATIONS = 'مقاصد';

    public const DISCOUNTS = 'کد تخفیف';

    public const TICKETS = 'تیکت‌ها';

    public const MESSAGES = 'پیام‌ها';

    public const REFERENCE_CHANNEL = '📡 کانال مرجع';

    public const COURSES = '🎓 دوره‌ها';

    public const SEMINARS = '🎤 سمینارها';

    public const EXPORT = 'خروجی کاربران';

    public const PROFILE = 'پروفایل بات';

    public const SETTINGS = 'تنظیمات';

    public const LOGS = 'لاگ‌ها';

    public const EVENTS = 'رویدادها';

    public const HOME = 'داشبورد';

    public const EXIT = 'خروج از پنل ادمین';

    /** @var list<list<string>> */
    private const ROWS = [
        [self::USERS, self::ADMINS],
        [self::STATS, self::BROADCAST],
        [self::REFERENCE_CHANNEL, self::COURSES],
        [self::SEMINARS, self::MESSAGES],
        [self::TICKETS, self::DISCOUNTS],
        [self::REQUIRED_CHATS, self::DESTINATIONS],
        [self::EXPORT, self::PROFILE],
        [self::SETTINGS, self::LOGS],
        [self::EVENTS, self::HOME],
        [self::EXIT],
    ];

    /** @var array<string, list<string>> */
    private const LEGACY = [
        self::USERS => ['👥 کاربران'],
        self::ADMINS => ['🛡 ادمین‌ها'],
        self::STATS => ['📊 آمار'],
        self::BROADCAST => ['📣 پیام همگانی'],
        self::REQUIRED_CHATS => ['📻 کانال اجباری'],
        self::DESTINATIONS => ['📍 مقاصد'],
        self::DISCOUNTS => ['🎟 کد تخفیف'],
        self::TICKETS => ['🎫 تیکت‌ها'],
        self::MESSAGES => ['💬 پیام‌ها'],
        self::REFERENCE_CHANNEL => ['مدیریت کانال مرجع'],
        self::COURSES => ['مدیریت دوره‌ها'],
        self::SEMINARS => ['مدیریت سمینارها'],
        self::EXPORT => ['📤 خروجی کاربران'],
        self::PROFILE => ['🤖 پروفایل بات'],
        self::SETTINGS => ['⚙️ تنظیمات'],
        self::LOGS => ['📋 لاگ‌ها'],
        self::EVENTS => ['📡 رویدادها'],
        self::HOME => ['🏠 داشبورد'],
        self::EXIT => ['❌ خروج از پنل ادمین'],
    ];

    /** Main-menu core labels — premium icon sends text without emoji prefix. */
    private const CATALOG_CORE_ALIASES = [
        self::REFERENCE_CHANNEL => ['کانال مرجع'],
        self::COURSES => ['دوره‌ها'],
        self::SEMINARS => ['سمینارها'],
    ];

    public function __construct(
        private readonly BotApiClient $api,
        private readonly AccountCache $accounts,
        private readonly ConversationRepository $conversations,
        private readonly MainMenu $mainMenu,
    ) {}

    public function open(int $chatId, int $telegramUserId): void
    {
        if (! $this->accounts->isBotAdmin($telegramUserId)) {
            $this->api->sendMessage($chatId, 'دسترسی ندارید.', [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);

            return;
        }

        $this->conversations->set($telegramUserId, 'admin_panel', []);
        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('shield').' <b>پنل ادمین</b>'
            ."\nاز دکمه‌های زیر استفاده کنید. بخش‌های دیتادار از سرور اصلی بارگذاری می‌شوند."
            ."\nاگر دکمه‌ها جواب ندادند: اتصال هاست↔ایران را از diagnose.php چک کنید.",
            [
                'parse_mode' => 'HTML',
                'reply_markup' => $this->replyMarkup(),
            ],
        );
    }

    public function exitToMain(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage($chatId, 'از پنل ادمین خارج شدید.', [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
    }

    public function isExitText(string $text): bool
    {
        return $this->normalizeLabel($text) === self::EXIT;
    }

    public function isAdminButton(string $text): bool
    {
        $label = $this->normalizeLabel($text);

        return $label !== null && $label !== self::EXIT;
    }

    public function isCatalogHubButton(string $text): bool
    {
        $label = $this->normalizeLabel($text);

        return $label !== null && in_array($label, [self::COURSES, self::REFERENCE_CHANNEL, self::SEMINARS], true);
    }

    public function normalizeLabel(string $text): ?string
    {
        $text = $this->normalizeTapText($text);
        if ($text === '') {
            return null;
        }

        foreach (self::ROWS as $row) {
            if (in_array($text, $row, true)) {
                return $text;
            }
        }

        foreach (self::LEGACY as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($text === $this->normalizeTapText($alias)) {
                    return $canonical;
                }
            }
        }

        return $this->normalizeAdminCoreLabel($text);
    }

    private function normalizeAdminCoreLabel(string $text): ?string
    {
        $core = $this->coreLabel($text);
        if ($core === '') {
            return null;
        }

        foreach (self::ROWS as $row) {
            foreach ($row as $canonical) {
                if ($core === $this->coreLabel($canonical)) {
                    return $canonical;
                }
            }
        }

        foreach (self::CATALOG_CORE_ALIASES as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($core === $this->coreLabel($alias)) {
                    return $canonical;
                }
            }
        }

        foreach (self::LEGACY as $canonical => $aliases) {
            foreach ($aliases as $alias) {
                if ($core === $this->coreLabel($alias)) {
                    return $canonical;
                }
            }
        }

        return null;
    }

    private function normalizeTapText(string $text): string
    {
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = str_replace(["\u{200c}", "\u{feff}", 'ي', 'ك'], ['', '', 'ی', 'ک'], $text);
        $text = preg_replace('/\s+/u', ' ', trim($text)) ?? trim($text);
        $text = TelegramCustomEmoji::stripLeadingFallback($text);

        return trim($text);
    }

    private function coreLabel(string $text): string
    {
        $core = preg_replace('/[\x{FE0F}\x{200D}\p{So}\p{Sk}]+/u', '', $text) ?? $text;
        $core = preg_replace('/\s+/u', ' ', trim($core)) ?? trim($core);

        return $core;
    }

    /** @return array<string, mixed> */
    public function replyMarkup(): array
    {
        $keyboard = [];
        foreach (self::ROWS as $row) {
            $keyboard[] = array_map(static fn (string $label): array => ['text' => $label], $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }
}
