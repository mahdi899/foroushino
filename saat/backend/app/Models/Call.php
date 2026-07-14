<?php

namespace App\Models;

use App\Enums\CallMethod;
use App\Enums\CallResult;
use App\Enums\CallState;
use App\Enums\DurationSource;
use App\Enums\ObjectionKey;
use App\Enums\SaleStage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Call extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id', 'agent_id', 'method', 'state', 'provider_call_id', 'result', 'note',
        'duration_sec', 'duration_source', 'disconnect_reason', 'objection',
        'next_stage', 'started_at', 'answered_at', 'ended_at', 'idempotency_key', 'correlation_id',
    ];

    protected function casts(): array
    {
        return [
            'method' => CallMethod::class,
            'state' => CallState::class,
            'duration_source' => DurationSource::class,
            'result' => CallResult::class,
            'objection' => ObjectionKey::class,
            'next_stage' => SaleStage::class,
            'started_at' => 'datetime',
            'answered_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class, 'created_from_call_id');
    }

    public function events(): HasMany
    {
        return $this->hasMany(CallEvent::class);
    }

    public function qualityReviews(): HasMany
    {
        return $this->hasMany(QualityReview::class);
    }

    public function isComplete(): bool
    {
        return $this->result !== null;
    }
}
