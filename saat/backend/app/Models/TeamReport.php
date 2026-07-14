<?php

namespace App\Models;

use App\Enums\TeamReportStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeamReport extends Model
{
    protected $fillable = [
        'team_id',
        'submitted_by',
        'report_date',
        'status',
        'summary',
        'leader_notes',
        'supervisor_notes',
        'approved_by',
        'approved_at',
        'forwarded_by',
        'forwarded_at',
    ];

    protected function casts(): array
    {
        return [
            'report_date' => 'date',
            'status' => TeamReportStatus::class,
            'summary' => 'array',
            'approved_at' => 'datetime',
            'forwarded_at' => 'datetime',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function forwarder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'forwarded_by');
    }
}
