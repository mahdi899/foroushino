<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyCommentStatus: string
{
    use EnumValues;

    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
