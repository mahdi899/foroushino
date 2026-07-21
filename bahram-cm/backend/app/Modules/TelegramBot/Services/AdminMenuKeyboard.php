<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Support\TelegramCustomEmoji;

class AdminMenuKeyboard
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

    public const EXPORT = 'خروجی کاربران';

    public const PROFILE = 'پروفایل بات';

    public const SETTINGS = 'تنظیمات';

    public const LOGS = 'لاگ‌ها';

    public const HOME = 'داشبورد';

    public const EXIT = 'خروج از پنل ادمین';

    /** Premium icon key per button label. */
    private const ICONS = [
        self::USERS => 'user',
        self::ADMINS => 'shield',
        self::STATS => 'chart',
        self::BROADCAST => 'channel',
        self::REQUIRED_CHATS => 'tv',
        self::DESTINATIONS => 'pin',
        self::DISCOUNTS => 'ticket',
        self::TICKETS => 'support',
        self::MESSAGES => 'chat',
        self::EXPORT => 'empty',
        self::PROFILE => 'robot',
        self::SETTINGS => 'tools',
        self::LOGS => 'notes',
        self::HOME => 'home',
        self::EXIT => 'cross',
    ];

    /** Old labels that may still sit on users' reply keyboards. */
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
        self::EXPORT => ['📤 خروجی کاربران'],
        self::PROFILE => ['🤖 پروفایل بات'],
        self::SETTINGS => ['⚙️ تنظیمات'],
        self::LOGS => ['📋 لاگ‌ها'],
        self::HOME => ['🏠 داشبورد'],
        self::EXIT => ['❌ خروج از پنل ادمین'],
    ];

    /**
     * Map each menu button to the permission that unlocks it.
     * HOME/EXIT are always available for bot admins.
     * ADMINS requires super rank (checked separately).
     *
     * @return array<string, BotAdminPermission|null>
     */
    public function buttonPermissions(): array
    {
        return [
            self::USERS => BotAdminPermission::UserInfo,
            self::ADMINS => null, // gated by canManageBotAdmins()
            self::STATS => BotAdminPermission::Stats,
            self::BROADCAST => BotAdminPermission::Broadcast,
            self::REQUIRED_CHATS => BotAdminPermission::ForcedJoin,
            self::DESTINATIONS => BotAdminPermission::Menus,
            self::DISCOUNTS => BotAdminPermission::Discount,
            self::TICKETS => BotAdminPermission::Tickets,
            self::MESSAGES => BotAdminPermission::Messages,
            self::EXPORT => BotAdminPermission::DataExport,
            self::PROFILE => BotAdminPermission::Settings,
            self::SETTINGS => BotAdminPermission::Settings,
            self::LOGS => BotAdminPermission::Stats,
            self::HOME => null,
            self::EXIT => null,
        ];
    }

    /** @return list<list<string>> */
    public function rows(?TelegramAccount $account = null): array
    {
        $all = [
            [self::USERS, self::ADMINS],
            [self::STATS, self::BROADCAST],
            [self::TICKETS, self::MESSAGES],
            [self::REQUIRED_CHATS, self::DESTINATIONS],
            [self::DISCOUNTS, self::EXPORT],
            [self::PROFILE, self::SETTINGS],
            [self::LOGS],
            [self::HOME, self::EXIT],
        ];

        if ($account === null) {
            return $all;
        }

        $map = $this->buttonPermissions();
        $filtered = [];
        foreach ($all as $row) {
            $kept = [];
            foreach ($row as $label) {
                if ($label === self::ADMINS) {
                    if ($account->canManageBotAdmins()) {
                        $kept[] = $label;
                    }

                    continue;
                }

                $permission = $map[$label] ?? null;
                if ($permission === null || $account->hasBotAdminPermission($permission)) {
                    $kept[] = $label;
                }
            }
            if ($kept !== []) {
                $filtered[] = $kept;
            }
        }

        return $filtered;
    }

    /** @return array<string, mixed> */
    public function replyMarkup(?TelegramAccount $account = null): array
    {
        $keyboard = [];
        foreach ($this->rows($account) as $row) {
            $keyboard[] = array_map(static function (string $text): array {
                $button = ['text' => $text];
                $iconKey = self::ICONS[$text] ?? null;
                if ($iconKey !== null) {
                    $button = [...$button, ...TelegramCustomEmoji::buttonIcon($iconKey)];
                }

                return $button;
            }, $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }

    public function isMenuButton(string $text, ?TelegramAccount $account = null): bool
    {
        $text = trim($text);
        if ($this->normalizeLabel($text) !== null) {
            return true;
        }

        foreach ($this->rows($account) as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        return array_key_exists($text, $this->buttonPermissions());
    }

    /** Map pressed text (current or legacy) to canonical label. */
    public function normalizeLabel(string $text): ?string
    {
        $text = trim($text);
        if ($text === '') {
            return null;
        }

        if (array_key_exists($text, $this->buttonPermissions())) {
            return $text;
        }

        foreach (self::LEGACY as $canonical => $aliases) {
            if (in_array($text, $aliases, true)) {
                return $canonical;
            }
        }

        return null;
    }

    /**
     * Inline button with optional premium icon.
     *
     * @param  array<string, mixed>  $extra
     * @return array<string, mixed>
     */
    public static function inlineButton(string $text, string $callbackData, ?string $iconKey = null, array $extra = []): array
    {
        $button = ['text' => $text, 'callback_data' => $callbackData, ...$extra];
        if ($iconKey !== null) {
            $button = [...$button, ...TelegramCustomEmoji::buttonIcon($iconKey)];
        }

        return $button;
    }
}
