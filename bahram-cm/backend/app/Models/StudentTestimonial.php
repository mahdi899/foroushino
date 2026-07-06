<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class StudentTestimonial extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'role',
        'before_text',
        'after_text',
        'summary',
        'meta_title',
        'meta_description',
        'metric_label',
        'metric_value',
        'body',
        'portrait_image',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered(Builder $query): Builder
    {
        return $query->orderBy('sort_order')->orderBy('id');
    }
}
