<?php

namespace App\Models;

use App\Enums\SatReviewStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SatCall extends Model
{
    protected $fillable = [
        'sat_lead_id',
        'staff_id',
        'direction',
        'outcome',
        'duration_seconds',
        'notes',
        'review_status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'called_at',
    ];

    protected $casts = [
        'review_status' => SatReviewStatus::class,
        'reviewed_at' => 'datetime',
        'called_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(SatLead::class, 'sat_lead_id');
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
