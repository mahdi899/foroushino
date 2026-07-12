<?php

namespace App\Models;

use App\Enums\LeadSource;
use App\Enums\LeadStatus;
use App\Enums\SaleStage;
use App\Enums\Temperature;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Lead extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'first_name', 'last_name', 'phone', 'normalized_phone', 'city', 'source',
        'temperature', 'priority', 'stage', 'status', 'product_id', 'campaign_id',
        'budget', 'job', 'experience', 'income_goal', 'interest_reason', 'best_call_time',
        'last_call_at', 'call_count', 'last_note', 'conversion_probability', 'pain_point',
        'objection', 'next_followup_at', 'rating', 'assigned_agent_id', 'assigned_team_id',
        'locked_by', 'locked_until', 'returned_to_pool', 'do_not_call_at', 'duplicate_of_id',
        'import_batch_id', 'bahram_application_id', 'metadata',
    ];

    protected function casts(): array
    {
        return [
            'source' => LeadSource::class,
            'temperature' => Temperature::class,
            'stage' => SaleStage::class,
            'status' => LeadStatus::class,
            'last_call_at' => 'datetime',
            'next_followup_at' => 'datetime',
            'locked_until' => 'datetime',
            'do_not_call_at' => 'datetime',
            'returned_to_pool' => 'boolean',
            'metadata' => 'array',
        ];
    }

    public function fullName(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function assignedAgent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_agent_id');
    }

    public function assignedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'assigned_team_id');
    }

    public function lockedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'locked_by');
    }

    public function duplicateOf(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'duplicate_of_id');
    }

    public function importBatch(): BelongsTo
    {
        return $this->belongsTo(ImportBatch::class);
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(LeadStatusHistory::class)->orderByDesc('created_at');
    }

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class);
    }

    public function followUps(): HasMany
    {
        return $this->hasMany(FollowUp::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function isLocked(): bool
    {
        return $this->locked_by !== null && $this->locked_until !== null && $this->locked_until->isFuture();
    }

    public function scopeUnassigned(Builder $query): Builder
    {
        return $query->whereNull('assigned_agent_id');
    }

    public function scopeEligibleForCycle(Builder $query): Builder
    {
        return $query->whereNotIn('status', array_map(fn ($s) => $s->value, LeadStatus::excludedFromCycle()));
    }

    public function scopeUnlocked(Builder $query): Builder
    {
        return $query->where(function (Builder $q): void {
            $q->whereNull('locked_by')->orWhere('locked_until', '<', now());
        });
    }
}
