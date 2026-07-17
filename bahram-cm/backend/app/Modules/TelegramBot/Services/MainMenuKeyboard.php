<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Models\TelegramAccount;

class MainMenuKeyboard
{
    /** @return list<list<string>> */
    public function rows(?TelegramAccount $account = null): array
    {
        $rows = [
            ['دوره کمپین نویسی 🎓'],
            ['سمینارها 🎤', 'سات ☎️'],
            ['کانال مرجع 📣', 'خانواده 👨‍👩‍👧‍👦'],
            ['معرفی دوستان 🎁', 'پشتیبانی 🎫', 'حساب کاربری 👤'],
        ];

        if ($account?->isBotAdmin()) {
            $rows[] = ['پنل ادمین بات 🛠'];
        }

        return $rows;
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
            // Do not set is_persistent: on Android Telegram it traps the system
            // Back button so the user cannot leave the chat / dismiss the keyboard.
        ];
    }

    public function isMenuButton(string $text, ?TelegramAccount $account = null): bool
    {
        foreach ($this->rows($account) as $row) {
            if (in_array($text, $row, true)) {
                return true;
            }
        }

        // Keep recognizing admin button even if flag was just toggled mid-session.
        return $text === 'پنل ادمین بات 🛠';
    }

    /** @return array<string, mixed> */
    public function remove(): array
    {
        return ['remove_keyboard' => true];
    }
}
