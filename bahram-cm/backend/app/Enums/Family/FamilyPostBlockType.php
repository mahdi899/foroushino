<?php

namespace App\Enums\Family;

use App\Enums\Concerns\EnumValues;

enum FamilyPostBlockType: string
{
    use EnumValues;

    case Text = 'text';
    case Audio = 'audio';
    case Video = 'video';
    case Image = 'image';
    case ArticleReference = 'article_reference';
    case ReplyContext = 'reply_context';
    case ActionReference = 'action_reference';
}
