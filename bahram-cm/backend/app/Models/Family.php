<?php

namespace App\Models;

use App\Enums\Family\FamilyLifecycle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Family extends Model
{
    protected $fillable = [
        'internal_name',
        'lifecycle',
        'member_count',
        'capacity_target',
        'capacity_min',
        'capacity_max',
        'primary_source',
        'entry_event_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'lifecycle' => FamilyLifecycle::class,
            'member_count' => 'integer',
            'capacity_target' => 'integer',
            'capacity_min' => 'integer',
            'capacity_max' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(FamilyMembership::class);
    }

    public function entryEvent(): BelongsTo
    {
        return $this->belongsTo(FamilyEntryEvent::class, 'entry_event_id');
    }

    public function dnaSnapshots(): HasMany
    {
        return $this->hasMany(FamilyDnaSnapshot::class);
    }

    public function dailyMetrics(): HasMany
    {
        return $this->hasMany(FamilyDailyMetric::class);
    }

    public function hasCapacity(): bool
    {
        return $this->member_count < $this->capacity_max;
    }

    public function isInHealthyRange(): bool
    {
        return $this->member_count >= $this->capacity_min
            && $this->member_count <= $this->capacity_max;
    }

    public function capacityRatio(): float
    {
        $max = max(1, $this->capacity_max);

        return min(1.0, $this->member_count / $max);
    }
}
