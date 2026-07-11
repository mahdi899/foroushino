<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum IdentityVerificationStatus: string
{
    use EnumValues;

    case NotStarted = 'not_started';
    case Draft = 'draft';
    case Submitted = 'submitted';
    case UnderReview = 'under_review';
    case NeedsCorrection = 'needs_correction';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
