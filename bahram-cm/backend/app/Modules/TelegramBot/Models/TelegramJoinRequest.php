<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;

class TelegramJoinRequest extends Model
{
    protected $fillable = [
        'telegram_bot_id',
        'telegram_destination_id',
        'chat_id',
        'telegram_user_id',
        'user_id',
        'status',
        'decision_reason',
        'decided_at',
    ];

    protected function casts(): array
    {
        return [
            'telegram_user_id' => 'integer',
            'decided_at' => 'datetime',
        ];
    }
}
