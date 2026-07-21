<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyStoryTarget extends Model
{
    protected $fillable = [
        'story_id',
        'family_id',
    ];

    public function story(): BelongsTo
    {
        return $this->belongsTo(FamilyStory::class, 'story_id');
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
