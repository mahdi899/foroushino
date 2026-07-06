<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum NextAction: string
{
    use EnumValues;

    case ScheduleRetry = 'schedule_retry';
    case CreateFollowUp = 'create_follow_up';
    case CreatePaymentPendingSale = 'create_payment_pending_sale';
    case CreateSalePendingConfirmation = 'create_sale_pending_confirmation';
    case ScheduleConsultation = 'schedule_consultation';
    case MarkDoNotCall = 'mark_do_not_call';
    case CloseLead = 'close_lead';
    case MarkDuplicate = 'mark_duplicate';
    case NeedsReview = 'needs_review';
    case None = 'none';
}
