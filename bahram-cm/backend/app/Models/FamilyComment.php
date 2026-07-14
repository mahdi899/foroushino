<?php

namespace App\Models;

use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FamilyComment extends Model
{
    protected $fillable = [
        'post_id',
        'family_id',
        'user_id',
        'body',
        'status',
        'rejection_reason',
        'rejection_note',
        'ai_risk_score',
        'ai_sentiment',
        'ai_topic',
        'ai_signals',
        'is_important',
        'featured_at',
        'family_pulse_at',
        'approved_at',
        'rejected_at',
        'seen_by_bahram_at',
        'moderated_by',
    ];

    protected function casts(): array
    {
        return [
            'status' => FamilyCommentStatus::class,
            'rejection_reason' => FamilyCommentRejectionReason::class,
            'ai_signals' => 'array',
            'ai_risk_score' => 'decimal:2',
            'is_important' => 'boolean',
            'featured_at' => 'datetime',
            'family_pulse_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'seen_by_bahram_at' => 'datetime',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function moderator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }
}
