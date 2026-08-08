<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyPostType: string
{
    use EnumValues;

    case Text = 'text';
    case Voice = 'voice';
    case Video = 'video';
    /** Telegram-style circular video message — media/block remain `video`. */
    case VideoNote = 'video_note';
    case Image = 'image';
    case ImageAlbum = 'image_album';
    case Article = 'article';
    case Mixed = 'mixed';
    case Reply = 'reply';
}
