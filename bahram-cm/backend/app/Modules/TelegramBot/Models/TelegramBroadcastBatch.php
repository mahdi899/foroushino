<?php

namespace App\Modules\TelegramBot\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TelegramBroadcastBatch extends Model
{
    protected $fillable = [
        'telegram_broadcast_id',
        'batch_index',
        'status',
    ];

    public function broadcast(): BelongsTo
    {
        return $this->belongsTo(TelegramBroadcast::class, 'telegram_broadcast_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(TelegramBroadcastRecipient::class, 'batch_id');
    }
}
