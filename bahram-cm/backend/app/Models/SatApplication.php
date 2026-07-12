<?php

namespace App\Models;

use App\Enums\SatApplicationStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SatApplication extends Model
{
    protected $fillable = [
        'user_id',
        'name',
        'mobile',
        'city',
        'age',
        'status',
        'admin_note',
        'submitted_at',
        'reviewed_at',
        'synced_to_sat_at',
        'sat_sync_error',
    ];

    protected $casts = [
        'age' => 'integer',
        'status' => SatApplicationStatus::class,
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'synced_to_sat_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
