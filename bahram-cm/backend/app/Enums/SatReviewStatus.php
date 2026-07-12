<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SatReviewStatus: string
{
    use EnumValues;

    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
