<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QualityReview extends Model
{
    protected $fillable = [
        'call_id', 'reviewer_id', 'agent_id', 'score', 'criteria_scores',
        'notes', 'status', 'dispute_reason', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'criteria_scores' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function call(): BelongsTo
    {
        return $this->belongsTo(Call::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }
}
