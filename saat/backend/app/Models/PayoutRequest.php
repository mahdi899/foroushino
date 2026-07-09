<?php

namespace App\Models;

use App\Enums\PayoutStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutRequest extends Model
{
    protected $fillable = [
        'user_id', 'amount', 'bank_fee', 'net_amount', 'status', 'requested_at', 'processed_at',
        'processed_by', 'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'bank_fee' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'status' => PayoutStatus::class,
            'requested_at' => 'datetime',
            'processed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function processedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
