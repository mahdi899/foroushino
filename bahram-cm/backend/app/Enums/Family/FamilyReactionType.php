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
    case ThumbsUp = 'thumbs_up';
    case Laugh = 'laugh';
    case Sad = 'sad';
    case Party = 'party';
    case Star = 'star';
    case Rocket = 'rocket';
    case Eyes = 'eyes';
    case Pray = 'pray';
    case Muscle = 'muscle';
    case Hundred = 'hundred';
    case Wink = 'wink';

    public function emoji(): string
    {
        return match ($this) {
            self::Fire => '🔥',
            self::Heart => '❤️',
            self::Target => '🎯',
            self::Clap => '👏',
            self::ThumbsUp => '👍',
            self::Laugh => '😂',
            self::Sad => '😢',
            self::Party => '🎉',
            self::Star => '⭐',
            self::Rocket => '🚀',
            self::Eyes => '👀',
            self::Pray => '🙏',
            self::Muscle => '💪',
            self::Hundred => '💯',
            self::Wink => '😉',
        };
    }
}
