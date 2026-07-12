<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum SatLeadStatus: string
{
    use EnumValues;

    case New = 'new';
    case Contacted = 'contacted';
    case Qualified = 'qualified';
    case Converted = 'converted';
    case Lost = 'lost';
}
