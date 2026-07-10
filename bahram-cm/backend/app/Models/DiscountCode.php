<?php

namespace App\Models;

use App\Enums\DiscountRestriction;
use App\Enums\DiscountType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DiscountCode extends Model
{
    protected $fillable = [
        'code',
        'title',
        'description',
        'discount_type',
        'discount_value',
        'is_active',
        'starts_at',
        'ends_at',
        'max_uses',
        'max_uses_per_user',
        'min_order_amount',
        'max_discount_amount',
        'requires_link',
        'restriction',
        'uses_count',
    ];

    protected $casts = [
        'discount_type' => DiscountType::class,
        'restriction' => DiscountRestriction::class,
        'is_active' => 'boolean',
        'requires_link' => 'boolean',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'discount_value' => 'integer',
        'max_uses' => 'integer',
        'max_uses_per_user' => 'integer',
        'min_order_amount' => 'integer',
        'max_discount_amount' => 'integer',
        'uses_count' => 'integer',
    ];

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'discount_code_product');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'discount_code_user');
    }

    public function usages(): HasMany
    {
        return $this->hasMany(DiscountCodeUsage::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function normalizedCode(): string
    {
        return strtoupper(trim($this->code));
    }
}
