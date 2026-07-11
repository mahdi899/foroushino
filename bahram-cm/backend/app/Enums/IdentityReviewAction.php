<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum IdentityReviewAction: string
{
    use EnumValues;

    case Approve = 'approve';
    case Reject = 'reject';
    case RequestCorrection = 'request_correction';
}
