<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\Ticket;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramMessageMap extends Model
{
    protected $fillable = [
        'ticket_id',
        'direction',
        'source_chat_id',
        'source_message_id',
        'target_chat_id',
        'target_message_id',
        'target_thread_id',
        'media_group_id',
        'edit_version',
        'edited_at',
    ];

    protected function casts(): array
    {
        return [
            'source_message_id' => 'integer',
            'target_message_id' => 'integer',
            'target_thread_id' => 'integer',
            'edit_version' => 'integer',
            'edited_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }
}
