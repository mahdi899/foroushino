<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Support\TelegramCustomEmoji;

class AdminsSectionKeyboard
{
    /** Same action as inline «افزودن» — pick a Telegram user to promote. */
    public const ADD_ADMIN = 'افزودن ادمین';

    public const BACK = 'بازگشت';

    private const LEGACY_ADD = ['➕ افزودن ادمین'];

    private const LEGACY_BACK = ['🔙 بازگشت'];

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
                    ...TelegramCustomEmoji::buttonIcon('add'),
                ]],
                [[
                    'text' => self::BACK,
                    ...TelegramCustomEmoji::buttonIcon('back'),
                ]],
            ],
            'resize_keyboard' => true,
        ];
    }

    /** Keyboard while waiting for the admin display name. */
    public function nameStepReplyMarkup(): array
    {
        return [
            'keyboard' => [
                [[
                    'text' => self::BACK,
                    ...TelegramCustomEmoji::buttonIcon('back'),
                ]],
            ],
            'resize_keyboard' => true,
        ];
    }

    public function isBack(string $text): bool
    {
        $text = trim($text);

        return $text === self::BACK || in_array($text, self::LEGACY_BACK, true);
    }

    public function isAdd(string $text): bool
    {
        $text = trim($text);

        return $text === self::ADD_ADMIN || in_array($text, self::LEGACY_ADD, true);
    }
}
