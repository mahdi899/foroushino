<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyEntryEventDailyMetric extends Model
{
    protected $fillable = ['entry_event_id', 'date', 'joins'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'joins' => 'integer',
        ];
    }

    public function entryEvent(): BelongsTo
    {
        return $this->belongsTo(FamilyEntryEvent::class, 'entry_event_id');
    }
}
