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
    ];

    protected $casts = [
        'age' => 'integer',
        'status' => SatApplicationStatus::class,
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
