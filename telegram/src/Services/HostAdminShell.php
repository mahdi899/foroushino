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

    public const REFERENCE_CHANNEL = 'کانال مرجع';

    public const COURSES = 'دوره‌ها';

    public const SEMINARS = 'سمینارها';

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
        self::EXIT => ['❌ خروج از پنل ادمین'],
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
        $text = trim($text);
        if ($text === self::EXIT) {
            return true;
        }

        return in_array($text, self::LEGACY[self::EXIT] ?? [], true);
    }

    public function isAdminButton(string $text): bool
    {
        $text = trim($text);
        if ($this->isExitText($text)) {
            return true;
        }
        foreach (self::ROWS as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        return false;
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
