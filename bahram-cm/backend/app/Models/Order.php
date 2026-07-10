<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    public const PLACEHOLDER_CUSTOMER_NAME = 'خریدار موقت';

    protected $fillable = [
        'user_id',
        'order_number',
        'product_id',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_national_code',
        'customer_extra_data',
        'referral_code',
        'discount_code_id',
        'coupon_code',
        'amount',
        'discount_amount',
        'coupon_discount_amount',
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
        'coupon_discount_amount' => 'integer',
        'final_amount' => 'integer',
        'sms_sent_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function courseAccess(): HasOne
    {
        return $this->hasOne(CourseAccess::class);
    }

    public function spotplayerLicense(): HasOne
    {
        return $this->hasOne(SpotplayerLicense::class)->latestOfMany();
    }

    public function referralConversion(): HasOne
    {
        return $this->hasOne(ReferralConversion::class);
    }

    public function discountCode(): BelongsTo
    {
        return $this->belongsTo(DiscountCode::class);
    }

    public function isPaid(): bool
    {
        return in_array($this->status, ['paid', 'fulfilled'], true);
    }

    public function needsProfileCompletion(): bool
    {
        $name = trim((string) $this->customer_name);

        return $name === ''
            || $name === self::PLACEHOLDER_CUSTOMER_NAME
            || $name === 'دانشجو';
    }
}
