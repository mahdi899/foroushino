<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum TeamReportStatus: string
{
    use EnumValues;

    case Submitted = 'submitted';
    case Approved = 'approved';
    case ForwardedToManager = 'forwarded_to_manager';
}
