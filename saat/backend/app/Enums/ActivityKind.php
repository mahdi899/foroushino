<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum ActivityKind: string
{
    use EnumValues;

    case Call = 'call';
    case Result = 'result';
    case FollowUp = 'follow_up';
    case Sale = 'sale';
    case Payment = 'payment';
    case Commission = 'commission';
    case Shift = 'shift';
    case Lead = 'lead';
    case Payout = 'payout';
}
