<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferenceChannelEntitlement extends Model
{
    protected $fillable = [
        'reference_channel_id',
        'user_id',
        'order_id',
        'source',
    ];

    public function referenceChannel(): BelongsTo
    {
        return $this->belongsTo(ReferenceChannel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
