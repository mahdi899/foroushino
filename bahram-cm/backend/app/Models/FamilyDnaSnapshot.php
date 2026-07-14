<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyDnaSnapshot extends Model
{
    protected $fillable = [
        'family_id',
        'period_start',
        'period_end',
        'voice_engagement',
        'video_engagement',
        'reaction_rate',
        'comment_rate',
        'action_commitment',
        'action_completion',
        'sales_interest',
        'campaign_interest',
        'mindset_interest',
        'summary_json',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'voice_engagement' => 'decimal:4',
            'video_engagement' => 'decimal:4',
            'reaction_rate' => 'decimal:4',
            'comment_rate' => 'decimal:4',
            'action_commitment' => 'decimal:4',
            'action_completion' => 'decimal:4',
            'sales_interest' => 'decimal:4',
            'campaign_interest' => 'decimal:4',
            'mindset_interest' => 'decimal:4',
            'summary_json' => 'array',
            'calculated_at' => 'datetime',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
