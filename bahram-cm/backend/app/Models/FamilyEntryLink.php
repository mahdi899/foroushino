<?php

namespace App\Models;

use App\Enums\Family\FamilyEntrySource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FamilyEntryLink extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'source',
        'entry_event_id',
        'campaign',
        'topic',
        'created_by',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'source' => FamilyEntrySource::class,
            'is_active' => 'boolean',
        ];
    }

    public function entryEvent(): BelongsTo
    {
        return $this->belongsTo(FamilyEntryEvent::class, 'entry_event_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function memberships(): HasMany
    {
        return $this->hasMany(FamilyMembership::class, 'entry_event_id', 'entry_event_id');
    }
}
