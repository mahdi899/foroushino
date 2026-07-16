<?php

namespace App\Modules\TelegramBot\Enums;

enum TelegramBotEnvironment: string
{
    case Production = 'production';
    case Staging = 'staging';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
