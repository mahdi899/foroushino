<?php

namespace App\Enums;

use App\Enums\Concerns\EnumValues;

enum PaymentMethod: string
{
    use EnumValues;

    case Card = 'card';
    case Gateway = 'gateway';
    case Installment = 'installment';
    case Cash = 'cash';
}
