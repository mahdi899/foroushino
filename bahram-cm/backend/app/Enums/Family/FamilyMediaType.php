<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyMediaType: string
{
    use EnumValues;

    case Voice = 'voice';
    case Video = 'video';
    case Image = 'image';
}
