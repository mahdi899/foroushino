<?php

namespace App\Models;

use App\Enums\SatLeadStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SatLead extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'email',
        'source',
        'notes',
        'status',
        'assigned_to',
        'created_by',
        'marketing_lead_id',
        'meta',
    ];

    protected $casts = [
        'status' => SatLeadStatus::class,
        'meta' => 'array',
    ];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function calls(): HasMany
    {
        return $this->hasMany(SatCall::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(SatActivity::class);
    }
}
