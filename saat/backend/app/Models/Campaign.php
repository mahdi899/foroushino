<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'product_id', 'source', 'starts_at', 'ends_at', 'is_active',
        'priority', 'max_daily_attempts', 'max_total_attempts', 'retry_cooldown_minutes',
        'allowed_hours_start', 'allowed_hours_end', 'sla_callback_minutes',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
