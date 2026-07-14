<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyDailyMetric extends Model
{
    protected $fillable = [
        'family_id',
        'date',
        'new_members',
        'posts_published',
        'reactions',
        'comments_approved',
        'comments_pending',
        'actions_completed',
        'voice_plays',
        'video_plays',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'new_members' => 'integer',
            'posts_published' => 'integer',
            'reactions' => 'integer',
            'comments_approved' => 'integer',
            'comments_pending' => 'integer',
            'actions_completed' => 'integer',
            'voice_plays' => 'integer',
            'video_plays' => 'integer',
        ];
    }

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }
}
