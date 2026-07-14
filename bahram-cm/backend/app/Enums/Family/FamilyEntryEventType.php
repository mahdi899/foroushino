<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyEntryEventType: string
{
    use EnumValues;

    case InstagramReel = 'instagram_reel';
    case InstagramStory = 'instagram_story';
    case Seminar = 'seminar';
    case Article = 'article';
    case Campaign = 'campaign';
    case Other = 'other';
}
