<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramDestinationMembership extends Model
{
    protected $fillable = [
        'user_id',
        'telegram_destination_id',
        'is_member',
        'checked_at',
    ];

    protected function casts(): array
    {
        return [
            'is_member' => 'boolean',
            'checked_at' => 'datetime',
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

    public function isFresh(int $maxAgeHours = 24): bool
    {
        if ($this->checked_at === null) {
            return false;
        }

        return $this->checked_at->gte(now()->subHours($maxAgeHours));
    }
}
