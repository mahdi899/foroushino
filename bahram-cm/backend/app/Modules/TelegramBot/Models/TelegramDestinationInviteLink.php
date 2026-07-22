<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramDestinationInviteLink extends Model
{
    protected $fillable = [
        'telegram_destination_id',
        'user_id',
        'telegram_account_id',
        'telegram_user_id',
        'invite_link',
        'expires_at',
        'revoked_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'telegram_user_id' => 'integer',
            'expires_at' => 'datetime',
            'revoked_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function destination(): BelongsTo
    {
        return $this->belongsTo(TelegramDestination::class, 'telegram_destination_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function telegramAccount(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'telegram_account_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isRevoked(): bool
    {
        return $this->revoked_at !== null;
    }

    public function isActive(): bool
    {
        return filled($this->invite_link) && ! $this->isExpired() && ! $this->isRevoked();
    }
}
