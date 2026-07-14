<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyPostStat extends Model
{
    protected $fillable = [
        'post_id',
        'family_id',
        'fire_count',
        'heart_count',
        'target_count',
        'clap_count',
        'approved_comments_count',
        'action_responses_count',
    ];

    protected function casts(): array
    {
        return [
            'fire_count' => 'integer',
            'heart_count' => 'integer',
            'target_count' => 'integer',
            'clap_count' => 'integer',
            'approved_comments_count' => 'integer',
            'action_responses_count' => 'integer',
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
