<?php

namespace App\Models;

use App\Modules\TelegramBot\Models\TelegramDestination;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;
use Stevebauman\Purify\Facades\Purify;

class ReferenceChannel extends Model
{
    use HasSlug;

    protected $fillable = [
        'title',
        'slug',
        'description',
        'status',
        'show_in_panel',
        'show_in_telegram',
        'price',
        'product_id',
        'telegram_destination_id',
        'cover_image',
        'cover_image_mobile',
    ];

    protected $casts = [
        'price' => 'integer',
        'telegram_destination_id' => 'integer',
        'show_in_panel' => 'boolean',
        'show_in_telegram' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saving(function (ReferenceChannel $channel) {
            if ($channel->isDirty('description') && filled($channel->description)) {
                $channel->description = Purify::clean($channel->description);
            }
        });
    }

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

    public function telegramDestination(): BelongsTo
    {
        return $this->belongsTo(TelegramDestination::class, 'telegram_destination_id');
    }

    public function entitlements(): HasMany
    {
        return $this->hasMany(ReferenceChannelEntitlement::class);
    }

    public function isPublished(): bool
    {
        return ($this->status ?? 'draft') === 'published';
    }
}
