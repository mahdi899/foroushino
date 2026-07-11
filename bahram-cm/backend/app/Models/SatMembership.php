<?php

namespace App\Models;

use App\Enums\SatMembershipStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SatMembership extends Model
{
    protected $fillable = [
        'user_id',
        'status',
        'activated_at',
        'suspended_at',
        'activation_source',
    ];

    protected function casts(): array
    {
        return [
            'status' => SatMembershipStatus::class,
            'activated_at' => 'datetime',
            'suspended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === SatMembershipStatus::Active;
    }
}
