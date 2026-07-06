<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SuggestReason: string
{
    use EnumValues;

    case OverdueFollowUp = 'overdue_follow_up';
    case TodayFollowUp = 'today_follow_up';
    case HotInWindow = 'hot_in_window';
    case InterestedNeedsFollowUp = 'interested_needs_follow_up';
    case FreshHighProb = 'fresh_high_prob';
    case Warm = 'warm';
    case Cold = 'cold';
    case FromPool = 'from_pool';
}
