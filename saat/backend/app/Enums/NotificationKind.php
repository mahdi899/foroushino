<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum NotificationKind: string
{
    use EnumValues;

    case Lead = 'lead';
    case Followup = 'followup';
    case Achievement = 'achievement';
    case System = 'system';
    case Sale = 'sale';
    case Commission = 'commission';
    case Payout = 'payout';
    case Quality = 'quality';
    case Shift = 'shift';
}
