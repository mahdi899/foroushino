<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum FollowupKind: string
{
    use EnumValues;

    case Call = 'call';
    case Message = 'message';
    case Reminder = 'reminder';
    case Meeting = 'meeting';
    case Payment = 'payment';
    case Consultation = 'consultation';
    case Info = 'info';
    case Decision = 'decision';
    case Custom = 'custom';
}
