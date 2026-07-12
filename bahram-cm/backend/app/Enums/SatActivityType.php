<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SatActivityType: string
{
    use EnumValues;

    case FollowUp = 'follow_up';
    case Meeting = 'meeting';
    case Note = 'note';
    case Sale = 'sale';
    case Other = 'other';
}
