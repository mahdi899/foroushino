<?php

namespace App\Modules\TelegramBot\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TelegramDestinationMobileMerge extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'canonical_mobile',
        'telegram_mobile',
        'canonical_user_id',
        'telegram_account_id',
        'status',
        'note',
        'approved_by',
        'approved_at',
        'revoked_by',
        'revoked_at',
    ];

    protected function casts(): array
    {
        return [
            'approved_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function canonicalUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'canonical_user_id');
    }

    public function telegramAccount(): BelongsTo
    {
        return $this->belongsTo(TelegramAccount::class, 'telegram_account_id');
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function revokedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isPending(): bool
    {
        return $this->status === self::STATUS_PENDING;
    }
}
