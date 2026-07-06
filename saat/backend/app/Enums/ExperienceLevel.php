<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum ExperienceLevel: string
{
    use EnumValues;

    case None = 'none';
    case Beginner = 'beginner';
    case Intermediate = 'intermediate';
    case Advanced = 'advanced';
}
