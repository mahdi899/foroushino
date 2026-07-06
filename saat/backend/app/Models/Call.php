<?php

namespace App\Models;

use App\Enums\CallResult;
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
        'lead_id', 'agent_id', 'result', 'note', 'duration_sec', 'objection',
        'next_stage', 'started_at', 'ended_at', 'idempotency_key',
    ];

    protected function casts(): array
    {
        return [
            'result' => CallResult::class,
            'objection' => ObjectionKey::class,
            'next_stage' => SaleStage::class,
            'started_at' => 'datetime',
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

    public function isComplete(): bool
    {
        return $this->result !== null;
    }
}
