<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum PayoutStatus: string
{
    use EnumValues;

    case Requested = 'requested';
    case Approved = 'approved';
    case Paid = 'paid';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
}
