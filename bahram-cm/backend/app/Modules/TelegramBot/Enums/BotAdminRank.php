<?php

namespace App\Modules\TelegramBot\Enums;

enum BotAdminRank: string
{
    case Simple = 'simple';
    case Super = 'super';

    public function labelFa(): string
    {
        return match ($this) {
            self::Simple => 'ادمین ساده',
            self::Super => 'ادمین برتر',
        };
    }
}
