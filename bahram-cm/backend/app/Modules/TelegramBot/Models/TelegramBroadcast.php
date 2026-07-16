<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramBroadcast extends Model
{
    protected $fillable = [
        'telegram_bot_id',
        'title',
        'status',
        'segment_key',
        'content',
        'audience_count',
        'requires_second_approval',
        'created_by',
        'approved_by',
        'scheduled_at',
        'started_at',
        'finished_at',
        'stopped_at',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
            'requires_second_approval' => 'boolean',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
            'stopped_at' => 'datetime',
        ];
    }

    public function bot(): BelongsTo
    {
        return $this->belongsTo(TelegramBot::class, 'telegram_bot_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(TelegramBroadcastBatch::class);
    }
}
