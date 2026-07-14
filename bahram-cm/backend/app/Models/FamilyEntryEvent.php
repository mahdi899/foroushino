<?php

namespace App\Models;

use App\Enums\Family\FamilyEntryEventType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyEntryEvent extends Model
{
    protected $fillable = [
        'name',
        'type',
        'external_reference',
        'topic',
        'metadata',
        'started_at',
        'ended_at',
    ];

    protected function casts(): array
    {
        return [
            'type' => FamilyEntryEventType::class,
            'metadata' => 'array',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function families(): HasMany
    {
        return $this->hasMany(Family::class, 'entry_event_id');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(FamilyMembership::class, 'entry_event_id');
    }
}
