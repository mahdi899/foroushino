<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Enums\BotAdminPermission;
use App\Modules\TelegramBot\Models\TelegramAccount;

class AdminMenuKeyboard
{
    public const USERS = '👥 کاربران';

    public const ADMINS = '🛡 ادمین‌ها';

    public const BROADCAST = '📣 پیام همگانی';

    public const REQUIRED_CHATS = '📻 کانال اجباری';

    public const DESTINATIONS = '📍 مقاصد';

    public const DISCOUNTS = '🎟 کد تخفیف';

    public const PROFILE = '🤖 پروفایل بات';

    public const SETTINGS = '⚙️ تنظیمات';

    public const LOGS = '📋 لاگ‌ها';

    public const HOME = '🏠 داشبورد';

    public const EXIT = '❌ خروج از پنل ادمین';

    /**
     * Map each menu button to the permission that unlocks it.
     * HOME/EXIT are always available for bot admins.
     *
     * @return array<string, BotAdminPermission|null>
     */
    public function buttonPermissions(): array
    {
        return [
            self::USERS => BotAdminPermission::UserInfo,
            self::ADMINS => BotAdminPermission::Settings,
            self::BROADCAST => BotAdminPermission::Broadcast,
            self::REQUIRED_CHATS => BotAdminPermission::ForcedJoin,
            self::DESTINATIONS => BotAdminPermission::Menus,
            self::DISCOUNTS => BotAdminPermission::Discount,
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
            [self::BROADCAST, self::REQUIRED_CHATS],
            [self::DESTINATIONS, self::DISCOUNTS],
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
            $keyboard[] = array_map(static fn (string $text) => ['text' => $text], $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }

    public function isMenuButton(string $text, ?TelegramAccount $account = null): bool
    {
        foreach ($this->rows($account) as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        // Still recognize known labels even if currently hidden (stale keyboard).
        return array_key_exists($text, $this->buttonPermissions());
    }
}
