<?php

namespace App\Modules\TelegramBot\Services;

class AdminsSectionKeyboard
{
    /** Same action as inline «افزودن» — pick a Telegram user to promote. */
    public const ADD_ADMIN = '➕ افزودن ادمین';

    public const BACK = '🔙 بازگشت';

    /** @return array<string, mixed> */
    public function replyMarkup(): array
    {
        return [
            'keyboard' => [
                [[
                    'text' => self::ADD_ADMIN,
                    'request_users' => [
                        'request_id' => 1001,
                        'user_is_bot' => false,
                        'max_quantity' => 1,
                    ],
                ]],
                [['text' => self::BACK]],
            ],
            'resize_keyboard' => true,
        ];
    }

    public function isBack(string $text): bool
    {
        return trim($text) === self::BACK;
    }
}
