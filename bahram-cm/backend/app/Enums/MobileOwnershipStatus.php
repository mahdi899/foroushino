<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum MobileOwnershipStatus: string
{
    use EnumValues;

    case NotStarted = 'not_started';
    case Pending = 'pending';
    case Verified = 'verified';
    case Mismatched = 'mismatched';
    case Locked = 'locked';
}
