<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyLifecycle: string
{
    use EnumValues;

    case Forming = 'forming';
    case Active = 'active';
    case Cooling = 'cooling';
    case Dormant = 'dormant';

    public function label(): string
    {
        return match ($this) {
            self::Forming => 'در حال تشکیل',
            self::Active => 'فعال',
            self::Cooling => 'در حال سرد شدن',
            self::Dormant => 'خفته',
        };
    }
}
