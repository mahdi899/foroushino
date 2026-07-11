<?php

namespace App\Models;

use App\Enums\IdentityCapability;
use App\Enums\OwnershipVerificationResult;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IdentityVerificationAttempt extends Model
{
    protected $fillable = [
        'user_id',
        'capability',
        'provider',
        'route_id',
        'status',
        'normalized_result',
        'provider_code',
        'provider_message',
        'provider_request_id',
        'attempt_number',
        'duration_ms',
        'requested_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'capability' => IdentityCapability::class,
            'normalized_result' => OwnershipVerificationResult::class,
            'attempt_number' => 'integer',
            'duration_ms' => 'integer',
            'requested_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
