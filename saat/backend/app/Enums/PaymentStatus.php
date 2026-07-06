<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum PaymentStatus: string
{
    use EnumValues;

    case Submitted = 'submitted';
    case Verified = 'verified';
    case Rejected = 'rejected';
}
