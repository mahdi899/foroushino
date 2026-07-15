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
        'thumbs_up_count',
        'laugh_count',
        'sad_count',
        'party_count',
        'star_count',
        'rocket_count',
        'eyes_count',
        'pray_count',
        'muscle_count',
        'hundred_count',
        'wink_count',
        'approved_comments_count',
        'action_responses_count',
        'views_count',
    ];

    protected function casts(): array
    {
        return [
            'fire_count' => 'integer',
            'heart_count' => 'integer',
            'target_count' => 'integer',
            'clap_count' => 'integer',
            'thumbs_up_count' => 'integer',
            'laugh_count' => 'integer',
            'sad_count' => 'integer',
            'party_count' => 'integer',
            'star_count' => 'integer',
            'rocket_count' => 'integer',
            'eyes_count' => 'integer',
            'pray_count' => 'integer',
            'muscle_count' => 'integer',
            'hundred_count' => 'integer',
            'wink_count' => 'integer',
            'approved_comments_count' => 'integer',
            'action_responses_count' => 'integer',
            'views_count' => 'integer',
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
