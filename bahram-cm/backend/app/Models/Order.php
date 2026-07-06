<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'order_number',
        'product_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_national_code',
        'customer_extra_data',
        'amount',
        'discount_amount',
        'final_amount',
        'status',
        'payment_status',
        'spotplayer_license_code',
        'sms_sent_at',
        'paid_at',
    ];

    protected $casts = [
        'customer_extra_data' => 'array',
        'amount' => 'integer',
        'discount_amount' => 'integer',
        'final_amount' => 'integer',
        'sms_sent_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function isPaid(): bool
    {
        return in_array($this->status, ['paid', 'fulfilled'], true);
    }
}
