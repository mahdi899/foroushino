<?php

namespace App\Models;

use App\Enums\FollowupKind;
use App\Enums\FollowupStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FollowUp extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id', 'agent_id', 'kind', 'title', 'due_at', 'status', 'priority',
        'note', 'created_from_call_id', 'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'kind' => FollowupKind::class,
            'status' => FollowupStatus::class,
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
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

    public function createdFromCall(): BelongsTo
    {
        return $this->belongsTo(Call::class, 'created_from_call_id');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', FollowupStatus::Pending->value);
    }

    /**
     * Matches follow-ups that are overdue whether or not the scheduled
     * `followups:mark-overdue` job has already flipped their persisted
     * status to `overdue` — a live query and the batch job agree on the
     * same definition.
     */
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where(function (Builder $q): void {
            $q->where('status', FollowupStatus::Overdue->value)
                ->orWhere(function (Builder $q2): void {
                    $q2->where('status', FollowupStatus::Pending->value)->where('due_at', '<', now());
                });
        });
    }
}
