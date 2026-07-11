<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum IdentityArtifactType: string
{
    use EnumValues;

    case NationalCardFront = 'national_card_front';
    case SelfieVideo = 'selfie_video';
}
