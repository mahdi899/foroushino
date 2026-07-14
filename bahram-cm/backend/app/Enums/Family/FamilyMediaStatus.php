<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyMediaStatus: string
{
    use EnumValues;

    case Uploading = 'uploading';
    case Queued = 'queued';
    case Transferring = 'transferring';
    case Processing = 'processing';
    case Ready = 'ready';
    case Failed = 'failed';
}
