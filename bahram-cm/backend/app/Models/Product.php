<?php

namespace App\Models;

use App\Enums\ProductType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Stevebauman\Purify\Facades\Purify;

class Product extends Model
{
    use HasSlug;

    /**
     * New, forward-looking product types. `normal`/`package` remain valid
     * legacy values already used by existing products.
     */
    public const TYPE_COURSE_SPOTPLAYER = ProductType::CourseSpotplayer->value;

    public const TYPE_MANUAL_SERVICE = ProductType::ManualService->value;

    public const TYPE_EVENT = ProductType::Event->value;

    protected $fillable = [
        'title',
        'slug',
        'type',
        'description',
        'short_description',
        'price',
        'sale_price',
        'referral_cashback_enabled',
        'referral_cashback_type',
        'referral_cashback_value',
        'is_active',
        'show_on_courses',
        'featured_listing',
        'course_level',
        'course_duration',
        'landing_href',
        'featured_image',
        'spotplayer_course_id',
        'spotplayer_product_id',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_on_courses' => 'boolean',
        'featured_listing' => 'boolean',
        'referral_cashback_enabled' => 'boolean',
        'price' => 'integer',
        'sale_price' => 'integer',
        'referral_cashback_value' => 'integer',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug')
            ->doNotGenerateSlugsOnUpdate();
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function courseAccesses(): HasMany
    {
        return $this->hasMany(CourseAccess::class);
    }

    public function seminar(): HasOne
    {
        return $this->hasOne(Seminar::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeListedOnCourses(Builder $query): Builder
    {
        return $query->where('show_on_courses', true);
    }

    /**
     * Effective price the customer pays (sale price when set and lower).
     */
    public function getEffectivePriceAttribute(): int
    {
        if ($this->sale_price !== null && $this->sale_price > 0 && $this->sale_price < $this->price) {
            return (int) $this->sale_price;
        }

        return (int) $this->price;
    }

    /**
     * Cashback reward for referrers when this product is purchased.
     * Basis amount is typically the order's final_amount (after discounts).
     */
    public function computeReferralCashback(int $basisAmount): int
    {
        if (! $this->referral_cashback_enabled) {
            return 0;
        }

        $type = $this->referral_cashback_type;
        $value = (int) ($this->referral_cashback_value ?? 0);

        if ($value <= 0 || ! in_array($type, ['percent', 'fixed'], true)) {
            return 0;
        }

        if ($type === 'percent') {
            return (int) round($basisAmount * min($value, 100) / 100);
        }

        return $value;
    }

    protected static function booted(): void
    {
        static::saving(function (Product $product) {
            if ($product->isDirty('description') && filled($product->description)) {
                $product->description = Purify::clean($product->description);
            }
        });
    }
}
