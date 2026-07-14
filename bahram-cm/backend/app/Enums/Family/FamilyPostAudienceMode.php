<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyPostAudienceMode: string
{
    use EnumValues;

    case All = 'all';
    case Include = 'include';
    case Exclude = 'exclude';
}
