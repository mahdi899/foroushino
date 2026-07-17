<?php

namespace App\Modules\TelegramBot\Models;

use App\Modules\TelegramBot\Support\TelegramChatIdResolver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramRequiredChat extends Model
{
    protected $fillable = [
        'telegram_bot_id',
        'chat_id',
        'title',
        'invite_link',
        'is_required',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_required' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function bot(): BelongsTo
    {
        return $this->belongsTo(TelegramBot::class, 'telegram_bot_id');
    }

    public function resolvedChatId(): string
    {
        return TelegramChatIdResolver::resolve((string) $this->chat_id, $this->invite_link);
    }
}
