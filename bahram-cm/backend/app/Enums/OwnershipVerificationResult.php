<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum OwnershipVerificationResult: string
{
    use EnumValues;

    case Matched = 'MATCHED';
    case Mismatched = 'MISMATCHED';
    case TechnicalError = 'TECHNICAL_ERROR';
    case ProviderError = 'PROVIDER_ERROR';
    case Unauthorized = 'UNAUTHORIZED';
    case RateLimited = 'RATE_LIMITED';
    case Pending = 'PENDING';
}
