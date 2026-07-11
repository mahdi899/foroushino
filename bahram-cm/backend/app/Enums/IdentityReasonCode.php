<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum IdentityReasonCode: string
{
    use EnumValues;

    case NationalCardUnreadable = 'national_card_unreadable';
    case NationalCardNotYours = 'national_card_not_yours';
    case SelfieUnsuitable = 'selfie_unsuitable';
    case InfoMismatch = 'info_mismatch';
    case ImageIncomplete = 'image_incomplete';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::NationalCardUnreadable => 'تصویر کارت ملی خوانا نیست',
            self::NationalCardNotYours => 'کارت ملی متعلق به شما نیست',
            self::SelfieUnsuitable => 'ویدیوی سلفی مناسب نیست',
            self::InfoMismatch => 'اطلاعات با مدارک مطابقت ندارد',
            self::ImageIncomplete => 'تصویر ناقص است',
            self::Other => 'سایر',
        };
    }
}
