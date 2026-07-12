<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum LeadSource: string
{
    use EnumValues;

    case Instagram = 'instagram';
    case Website = 'website';
    case Telegram = 'telegram';
    case Ads = 'ads';
    case Webinar = 'webinar';
    case Form = 'form';
    case Excel = 'excel';
    case Bahram = 'bahram';
}
