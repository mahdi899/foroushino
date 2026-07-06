<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum ImportStatus: string
{
    use EnumValues;

    case Processing = 'processing';
    case Completed = 'completed';
    case Failed = 'failed';
}
