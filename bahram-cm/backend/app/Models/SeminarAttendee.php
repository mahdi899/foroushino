<?php

namespace App\Models;

use App\Enums\SeminarAttendanceStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SeminarAttendee extends Model
{
    protected $fillable = [
        'seminar_id',
        'user_id',
        'attendance_status',
    ];

    protected $casts = [
        'attendance_status' => SeminarAttendanceStatus::class,
    ];

    public function seminar(): BelongsTo
    {
        return $this->belongsTo(Seminar::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
