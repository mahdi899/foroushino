<?php

namespace App\Models;

use App\Enums\Family\FamilyEntrySource;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyMembership extends Model
{
    protected $fillable = [
        'user_id',
        'family_id',
        'entry_source',
        'entry_campaign',
        'entry_content',
        'entry_referrer',
        'entry_event_id',
        'assignment_score',
        'onboarding_completed',
        'onboarding_completed_at',
        'joined_at',
    ];

    protected function casts(): array
    {
        return [
            'entry_source' => FamilyEntrySource::class,
            'assignment_score' => 'decimal:4',
            'onboarding_completed' => 'boolean',
            'onboarding_completed_at' => 'datetime',
            'joined_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function entryEvent(): BelongsTo
    {
        return $this->belongsTo(FamilyEntryEvent::class, 'entry_event_id');
    }
}
