<?php

namespace App\Modules\TelegramBot\Models;

use App\Modules\TelegramBot\Enums\ConversationState;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramConversation extends Model
{
    protected $fillable = [
        'telegram_account_id',
        'state',
        'version',
        'context',
    ];

    protected function casts(): array
    {
        return [
            'state' => ConversationState::class,
            'version' => 'integer',
            'context' => 'array',
        ];
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'telegram_account_id');
    }
}
