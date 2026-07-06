<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum FollowupStatus: string
{
    use EnumValues;

    case Pending = 'pending';
    case Done = 'done';
    case Overdue = 'overdue';
    case Cancelled = 'cancelled';
    case Snoozed = 'snoozed';
}
