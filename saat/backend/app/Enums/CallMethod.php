<?php

namespace App\Enums;

enum CallMethod: string
{
    case Native = 'native';
    case Voip = 'voip';
}
