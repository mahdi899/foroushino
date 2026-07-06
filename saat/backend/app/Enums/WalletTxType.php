<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum WalletTxType: string
{
    use EnumValues;

    case CommissionPending = 'commission_pending';
    case CommissionApproved = 'commission_approved';
    case CommissionAvailable = 'commission_available';
    case PayoutRequested = 'payout_requested';
    case PayoutPaid = 'payout_paid';
    case PayoutRejected = 'payout_rejected';
    case Reversal = 'reversal';
    case Adjustment = 'adjustment';
}
