<?php

namespace App\Models;

use App\Enums\ReferralConversionStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralConversion extends Model
{
    protected $fillable = [
        'referrer_user_id',
        'buyer_user_id',
        'order_id',
        'status',
        'cashback_amount',
        'converted_at',
    ];

    protected $casts = [
        'status' => ReferralConversionStatus::class,
        'cashback_amount' => 'integer',
        'converted_at' => 'datetime',
    ];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_user_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
