<?php

namespace App\Enums;

enum DurationSource: string
{
    case Unverified = 'unverified';
    case Agent = 'agent';
    case Provider = 'provider';
    case Bridge = 'bridge';
}
