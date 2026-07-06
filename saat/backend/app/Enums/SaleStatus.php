<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SaleStatus: string
{
    use EnumValues;

    case Draft = 'draft';
    case PaymentPending = 'payment_pending';
    case PaymentSubmitted = 'payment_submitted';
    case PendingConfirmation = 'pending_confirmation';
    case Confirmed = 'confirmed';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';
    case Refunded = 'refunded';
}
