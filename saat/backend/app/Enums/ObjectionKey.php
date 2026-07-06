<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum ObjectionKey: string
{
    use EnumValues;

    case Price = 'price';
    case Time = 'time';
    case Trust = 'trust';
    case NeedMoreInfo = 'need_more_info';
    case Thinking = 'thinking';
    case SpouseDecision = 'spouse_decision';
    case NoBudget = 'no_budget';
}
