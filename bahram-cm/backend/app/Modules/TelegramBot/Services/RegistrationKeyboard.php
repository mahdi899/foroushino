<?php

namespace App\Modules\TelegramBot\Services;

class RegistrationKeyboard
{
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
}
