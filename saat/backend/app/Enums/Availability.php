<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum Availability: string
{
    use EnumValues;

    case Available = 'available';
    case InCall = 'in_call';
    case OnBreak = 'on_break';
    case DoingFollowUp = 'doing_follow_up';
    case Offline = 'offline';
}
