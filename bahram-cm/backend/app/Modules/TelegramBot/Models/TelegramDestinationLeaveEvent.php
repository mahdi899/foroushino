<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramDestinationLeaveEvent extends Model
{
    protected $fillable = [
        'user_id',
        'telegram_destination_id',
        'telegram_user_id',
        'previous_status',
        'account_released',
        'detected_at',
    ];

    protected function casts(): array
    {
        return [
            'account_released' => 'boolean',
            'detected_at' => 'datetime',
            'telegram_user_id' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(TelegramDestination::class, 'telegram_destination_id');
    }
}
