<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyUserBehaviorProfile extends Model
{
    protected $fillable = [
        'user_id',
        'voice_completion_score',
        'video_completion_score',
        'reaction_score',
        'comment_score',
        'commitment_score',
        'execution_score',
        'sales_affinity',
        'campaign_affinity',
        'mindset_affinity',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'voice_completion_score' => 'decimal:2',
            'video_completion_score' => 'decimal:2',
            'reaction_score' => 'decimal:2',
            'comment_score' => 'decimal:2',
            'commitment_score' => 'decimal:2',
            'execution_score' => 'decimal:2',
            'sales_affinity' => 'decimal:2',
            'campaign_affinity' => 'decimal:2',
            'mindset_affinity' => 'decimal:2',
            'calculated_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
