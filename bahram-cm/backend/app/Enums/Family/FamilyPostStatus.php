<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyPostStatus: string
{
    use EnumValues;

    case Draft = 'draft';
    case Published = 'published';
    case Archived = 'archived';
}
