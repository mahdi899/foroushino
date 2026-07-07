<?php

namespace App\Models;

use App\Enums\ProductType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
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
        'is_active',
        'featured_image',
        'spotplayer_course_id',
        'spotplayer_product_id',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'price' => 'integer',
        'sale_price' => 'integer',
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

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
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

    protected static function booted(): void
    {
        static::saving(function (Product $product) {
            if ($product->isDirty('description') && filled($product->description)) {
                $product->description = Purify::clean($product->description);
            }
        });
    }
}
