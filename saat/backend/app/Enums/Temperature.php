<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum Temperature: string
{
    use EnumValues;

    case Hot = 'hot';
    case Warm = 'warm';
    case Cold = 'cold';
}
