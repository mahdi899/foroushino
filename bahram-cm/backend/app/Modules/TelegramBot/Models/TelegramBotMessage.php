<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramBotMessage extends Model
{
    protected $fillable = [
        'telegram_bot_id',
        'message_key',
        'body',
        'label_fa',
        'category',
    ];

    public function bot(): BelongsTo
    {
        return $this->belongsTo(TelegramBot::class, 'telegram_bot_id');
    }
}
