<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum IdentityCapability: string
{
    use EnumValues;

    case IdentityManualReview = 'IDENTITY_MANUAL_REVIEW';
    case DocumentReview = 'DOCUMENT_REVIEW';
    case SelfieVideoVerification = 'SELFIE_VIDEO_VERIFICATION';
    case FaceLiveness = 'FACE_LIVENESS';
    case FaceMatch = 'FACE_MATCH';
    case MobileNationalCodeMatch = 'MOBILE_NATIONAL_CODE_MATCH';
    case CardNationalCodeMatch = 'CARD_NATIONAL_CODE_MATCH';
    case IbanNationalCodeMatch = 'IBAN_NATIONAL_CODE_MATCH';
}
