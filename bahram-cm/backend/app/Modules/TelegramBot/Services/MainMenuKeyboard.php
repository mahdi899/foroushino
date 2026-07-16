<?php

namespace App\Modules\TelegramBot\Services;

class MainMenuKeyboard
{
    /** @return list<list<string>> */
    public function rows(): array
    {
        return [
            ['دوره کمپین نویسی 🎓'],
            ['سمینارها 🎤', 'سات ☎️'],
            ['کانال مرجع 📣', 'خانواده 👨‍👩‍👧‍👦'],
            ['معرفی دوستان 🎁', 'پشتیبانی 🎫', 'حساب کاربری 👤'],
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
            'is_persistent' => true,
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

    /** @return array<string, mixed> */
    public function remove(): array
    {
        return ['remove_keyboard' => true];
    }
}
