<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyActionType: string
{
    use EnumValues;

    case Commitment = 'commitment';
    case Confirmation = 'confirmation';
    case Number = 'number';
    case SingleChoice = 'single_choice';
    case MultiChoice = 'multi_choice';
    case ShortText = 'short_text';
    case Scale = 'scale';
}
