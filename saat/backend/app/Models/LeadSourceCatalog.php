<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class LeadSourceCatalog extends Model
{
    protected $table = 'lead_sources';

    protected $fillable = [
        'slug',
        'label',
        'sort_order',
        'is_active',
        'is_system',
        'show_in_form',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'is_system' => 'boolean',
            'show_in_form' => 'boolean',
        ];
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForForm(Builder $query): Builder
    {
        return $query->active()->where('show_in_form', true);
    }
}
