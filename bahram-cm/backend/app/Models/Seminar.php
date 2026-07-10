<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Stevebauman\Purify\Facades\Purify;

class Seminar extends Model
{
    use HasSlug;

    protected $fillable = [
        'title',
        'slug',
        'date',
        'location',
        'description',
        'cover_image',
        'status',
        'product_id',
        'price',
        'sale_price',
        'capacity',
        'banner_available',
        'banner_available_mobile',
        'banner_full',
        'banner_full_mobile',
        'promo_enabled',
    ];

    protected $casts = [
        'date' => 'datetime',
        'price' => 'integer',
        'sale_price' => 'integer',
        'capacity' => 'integer',
        'promo_enabled' => 'boolean',
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

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function attendees(): HasMany
    {
        return $this->hasMany(SeminarAttendee::class);
    }

    public function assets(): HasMany
    {
        return $this->hasMany(SeminarAsset::class);
    }

    public function certificates(): HasMany
    {
        return $this->hasMany(Certificate::class);
    }

    public function registeredCount(): int
    {
        return $this->attendees()
            ->where('attendance_status', '!=', 'absent')
            ->count();
    }

    public function remainingSeats(): ?int
    {
        if ($this->capacity === null || $this->capacity <= 0) {
            return null;
        }

        return max(0, (int) $this->capacity - $this->registeredCount());
    }

    public function isFull(): bool
    {
        if ($this->capacity === null || $this->capacity <= 0) {
            return false;
        }

        return $this->registeredCount() >= (int) $this->capacity;
    }

    public function purchaseSlug(): ?string
    {
        return $this->product?->slug;
    }

    protected static function booted(): void
    {
        static::saving(function (Seminar $seminar) {
            if ($seminar->isDirty('description') && filled($seminar->description)) {
                $seminar->description = Purify::clean($seminar->description);
            }
        });
    }
}
