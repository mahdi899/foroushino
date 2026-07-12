<?php

namespace App\Models;

use App\Enums\SatActivityType;
use App\Enums\SatReviewStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SatActivity extends Model
{
    protected $fillable = [
        'sat_lead_id',
        'staff_id',
        'type',
        'description',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'meta',
    ];

    protected $casts = [
        'type' => SatActivityType::class,
        'status' => SatReviewStatus::class,
        'reviewed_at' => 'datetime',
        'meta' => 'array',
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
