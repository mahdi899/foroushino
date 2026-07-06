<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum LeadStatus: string
{
    use EnumValues;

    case New = 'new';
    case Assigned = 'assigned';
    case Queued = 'queued';
    case Locked = 'locked';
    case InCall = 'in_call';
    case Contacted = 'contacted';
    case FollowUpRequired = 'follow_up_required';
    case FollowUpOverdue = 'follow_up_overdue';
    case ConsultationScheduled = 'consultation_scheduled';
    case PaymentPending = 'payment_pending';
    case PaymentSubmitted = 'payment_submitted';
    case SalePendingConfirmation = 'sale_pending_confirmation';
    case Won = 'won';
    case Lost = 'lost';
    case NoAnswer = 'no_answer';
    case Unreachable = 'unreachable';
    case WrongNumber = 'wrong_number';
    case Duplicate = 'duplicate';
    case DoNotCall = 'do_not_call';
    case ReturnedToPool = 'returned_to_pool';
    case NeedsSupervisorReview = 'needs_supervisor_review';

    /**
     * Statuses that make a lead ineligible for the calling cycle.
     *
     * @return array<int, self>
     */
    public static function excludedFromCycle(): array
    {
        return [self::Won, self::Lost, self::DoNotCall, self::Duplicate];
    }
}
