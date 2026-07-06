<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Wallet extends Model
{
    protected $fillable = [
        'user_id', 'balance_available', 'balance_pending', 'balance_locked',
        'total_earned', 'total_paid',
    ];

    protected function casts(): array
    {
        return [
            'balance_available' => 'decimal:2',
            'balance_pending' => 'decimal:2',
            'balance_locked' => 'decimal:2',
            'total_earned' => 'decimal:2',
            'total_paid' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
