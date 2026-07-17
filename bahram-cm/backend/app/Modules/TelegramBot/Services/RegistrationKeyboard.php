<?php

namespace App\Modules\TelegramBot\Services;

class RegistrationKeyboard
{
    public const BACK_LABEL = '↩️ بازگشت';

    /** @return array<string, mixed> */
    public function requestContactMarkup(): array
    {
        return [
            'keyboard' => [[
                ['text' => '📱 ارسال شماره تماس', 'request_contact' => true],
            ]],
            'resize_keyboard' => true,
            'one_time_keyboard' => true,
        ];
    }

    /** @return array<string, mixed> */
    public function nameStepMarkup(): array
    {
        return [
            'keyboard' => [[
                ['text' => self::BACK_LABEL],
            ]],
            'resize_keyboard' => true,
            'one_time_keyboard' => true,
        ];
    }

    public function isBackLabel(string $text): bool
    {
        $normalized = trim($text);

        return $normalized === self::BACK_LABEL
            || $normalized === 'بازگشت'
            || $normalized === '/back';
    }
}
