<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

class Seminar extends Model
{
    use HasSlug;

    protected $fillable = [
        'title',
        'slug',
        'date',
        'location',
        'description',
        'status',
    ];

    protected $casts = [
        'date' => 'datetime',
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
}
