<?php

namespace App\Enums;

enum CallState: string
{
    case Created = 'created';
    case Dialing = 'dialing';
    case Ringing = 'ringing';
    case Answered = 'answered';
    case Ended = 'ended';
    case Dispositioned = 'dispositioned';
}
