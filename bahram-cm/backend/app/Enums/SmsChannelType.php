<?php

namespace App\Enums;

enum SmsChannelType: string
{
    case Sms = 'sms';
    case Messenger = 'messenger';

    public function label(): string
    {
        return match ($this) {
            self::Sms => 'پیامک',
            self::Messenger => 'پیام‌رسان',
        };
    }
}
