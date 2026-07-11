<?php

namespace App\Models;

use App\Enums\IdentityReasonCode;
use App\Enums\IdentityReviewAction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdentityVerificationReview extends Model
{
    protected $fillable = [
        'submission_id',
        'reviewer_id',
        'action',
        'reason_code',
        'reviewer_note',
        'correction_items',
    ];

    protected function casts(): array
    {
        return [
            'action' => IdentityReviewAction::class,
            'reason_code' => IdentityReasonCode::class,
            'correction_items' => 'array',
        ];
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(IdentityVerificationSubmission::class, 'submission_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }
}
