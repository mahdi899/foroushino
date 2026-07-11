<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SatMembershipStatus: string
{
    use EnumValues;

    case Inactive = 'inactive';
    case Active = 'active';
    case Suspended = 'suspended';
}
