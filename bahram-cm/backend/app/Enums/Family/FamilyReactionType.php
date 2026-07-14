<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyReactionType: string
{
    use EnumValues;

    case Fire = 'fire';
    case Heart = 'heart';
    case Target = 'target';
    case Clap = 'clap';

    public function emoji(): string
    {
        return match ($this) {
            self::Fire => '🔥',
            self::Heart => '❤️',
            self::Target => '🎯',
            self::Clap => '👏',
        };
    }
}
