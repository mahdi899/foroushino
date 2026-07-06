<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    protected $fillable = [
        'order_id',
        'gateway',
        'authority',
        'ref_id',
        'amount',
        'status',
        'request_payload',
        'verify_payload',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'integer',
        'request_payload' => 'array',
        'verify_payload' => 'array',
        'paid_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
