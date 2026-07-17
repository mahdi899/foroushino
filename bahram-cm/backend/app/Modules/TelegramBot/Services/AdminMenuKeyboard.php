<?php

namespace App\Modules\TelegramBot\Services;

class AdminMenuKeyboard
{
    public const USERS = '👥 کاربران';

    public const ADMINS = '🛡 ادمین‌ها';

    public const BROADCAST = '📣 پیام همگانی';

    public const REQUIRED_CHATS = '📻 کانال اجباری';

    public const DESTINATIONS = '📍 مقاصد';

    public const PROFILE = '🤖 پروفایل بات';

    public const SETTINGS = '⚙️ تنظیمات';

    public const LOGS = '📋 لاگ‌ها';

    public const HOME = '🏠 داشبورد';

    public const EXIT = '❌ خروج از پنل ادمین';

    /** @return list<list<string>> */
    public function rows(): array
    {
        return [
            [self::USERS, self::ADMINS],
            [self::BROADCAST, self::REQUIRED_CHATS],
            [self::DESTINATIONS, self::PROFILE],
            [self::SETTINGS, self::LOGS],
            [self::HOME, self::EXIT],
        ];
    }

    /** @return array<string, mixed> */
    public function replyMarkup(): array
    {
        $keyboard = [];
        foreach ($this->rows() as $row) {
            $keyboard[] = array_map(static fn (string $text) => ['text' => $text], $row);
        }

        return [
            'keyboard' => $keyboard,
            'resize_keyboard' => true,
        ];
    }

    public function isMenuButton(string $text): bool
    {
        foreach ($this->rows() as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        return false;
    }
}
