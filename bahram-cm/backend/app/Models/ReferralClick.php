<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralClick extends Model
{
    protected $fillable = [
        'referral_code_id',
        'visitor_id',
        'ip_address',
        'user_agent',
        'landing_url',
    ];

    public function referralCode(): BelongsTo
    {
        return $this->belongsTo(ReferralCode::class);
    }
}
