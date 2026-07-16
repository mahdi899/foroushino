<?php

namespace App\Modules\TelegramBot\Models;

use App\Modules\TelegramBot\Enums\UpdateStatus;
use App\Modules\TelegramBot\Enums\UpdateType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramUpdate extends Model
{
    use HasFactory;

    protected $fillable = [
        'telegram_bot_id',
        'update_id',
        'update_type',
        'payload',
        'status',
        'attempts',
        'error_message',
        'received_at',
        'processing_started_at',
        'processed_at',
        'failed_at',
    ];

    protected function casts(): array
    {
        return [
            'update_id' => 'integer',
            'update_type' => UpdateType::class,
            'payload' => 'array',
            'status' => UpdateStatus::class,
            'attempts' => 'integer',
            'received_at' => 'datetime',
            'processing_started_at' => 'datetime',
            'processed_at' => 'datetime',
            'failed_at' => 'datetime',
        ];
    }

    public function bot(): BelongsTo
    {
        return $this->belongsTo(TelegramBot::class, 'telegram_bot_id');
    }

    /**
     * Best-effort extraction of the originating Telegram user id, used as
     * the per-user processing lock key. Different update types nest the
     * `from` object at different paths.
     */
    public function telegramUserId(): ?int
    {
        $payload = $this->payload ?? [];

        $candidates = [
            data_get($payload, 'message.from.id'),
            data_get($payload, 'edited_message.from.id'),
            data_get($payload, 'callback_query.from.id'),
            data_get($payload, 'my_chat_member.from.id'),
            data_get($payload, 'chat_member.from.id'),
            data_get($payload, 'chat_join_request.from.id'),
        ];

        foreach ($candidates as $candidate) {
            if (is_int($candidate) || (is_string($candidate) && ctype_digit($candidate))) {
                return (int) $candidate;
            }
        }

        return null;
    }
}
