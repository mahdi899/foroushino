<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyPostDailyMetric extends Model
{
    protected $fillable = [
        'post_id',
        'family_id',
        'date',
        'reactions',
        'comments',
        'action_responses',
        'voice_completions',
        'video_completions',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'reactions' => 'integer',
            'comments' => 'integer',
            'action_responses' => 'integer',
            'voice_completions' => 'integer',
            'video_completions' => 'integer',
        ];
    }

    public function post(): BelongsTo
    {
        return $this->belongsTo(FamilyPost::class, 'post_id');
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
