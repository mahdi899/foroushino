<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoachingTask extends Model
{
    protected $fillable = [
        'agent_id', 'coach_id', 'quality_review_id', 'title', 'description',
        'status', 'due_at', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function coach(): BelongsTo
    {
        return $this->belongsTo(User::class, 'coach_id');
    }

    public function qualityReview(): BelongsTo
    {
        return $this->belongsTo(QualityReview::class);
    }
}
