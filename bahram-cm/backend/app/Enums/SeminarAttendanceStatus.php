<?php

namespace App\Enums;

enum SeminarAttendanceStatus: string
{
    case Registered = 'registered';
    case Attended = 'attended';
    case Absent = 'absent';

    public static function values(): array
    {
        return array_map(fn ($c) => $c->value, self::cases());
    }
}
