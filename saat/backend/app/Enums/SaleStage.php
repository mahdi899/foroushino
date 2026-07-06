<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SaleStage: string
{
    use EnumValues;

    case New = 'new';
    case FirstCall = 'first_call';
    case Interested = 'interested';
    case FollowUp = 'follow_up';
    case Meeting = 'meeting';
    case PaymentPending = 'payment_pending';
    case Won = 'won';
    case Lost = 'lost';
}
