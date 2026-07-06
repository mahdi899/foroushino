<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum CommissionStatus: string
{
    use EnumValues;

    case Pending = 'pending';
    case Approved = 'approved';
    case Available = 'available';
    case Rejected = 'rejected';
    case Paid = 'paid';
    case Reversed = 'reversed';
}
