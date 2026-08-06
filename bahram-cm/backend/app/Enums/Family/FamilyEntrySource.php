<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyEntrySource: string
{
    use EnumValues;

    case Instagram = 'instagram';
    case InstagramReel = 'instagram_reel';
    case InstagramStory = 'instagram_story';
    case DmAutomation = 'dm_automation';
    case Website = 'website';
    case Article = 'article';
    case Seminar = 'seminar';
    case Campaign = 'campaign';
    case Telegram = 'telegram';
    case Landings = 'landings';
    /** @deprecated Not offered in manager pickers; kept for existing records / internal fallbacks. */
    case Direct = 'direct';

    public function label(): string
    {
        return match ($this) {
            self::Instagram => 'اینستاگرام',
            self::InstagramReel => 'ریلز اینستاگرام',
            self::InstagramStory => 'استوری اینستاگرام',
            self::DmAutomation => 'اتوماسیون دایرکت',
            self::Website => 'وب‌سایت',
            self::Article => 'مقاله',
            self::Seminar => 'سمینار',
            self::Campaign => 'کمپین',
            self::Telegram => 'تلگرام',
            self::Landings => 'لندینگ‌ها',
            self::Direct => 'ورود مستقیم',
        };
    }
}
