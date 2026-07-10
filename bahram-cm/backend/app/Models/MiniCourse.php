<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stevebauman\Purify\Facades\Purify;

class MiniCourse extends Model
{
    protected $fillable = [
        'product_id',
        'slug',
        'title',
        'subtitle',
        'summary',
        'description',
        'thumbnail',
        'thumbnail_mobile',
        'aparat_hash',
        'level',
        'duration',
        'sort_order',
        'is_active',
        'comments_enabled',
        'meta_title',
        'meta_description',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'comments_enabled' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function comments(): HasMany
    {
        return $this->hasMany(MiniCourseComment::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(MiniCourseEnrollment::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }

    protected static function booted(): void
    {
        static::saving(function (MiniCourse $course) {
            if ($course->isDirty('description') && filled($course->description)) {
                $course->description = Purify::clean($course->description);
            }
        });
    }
}
