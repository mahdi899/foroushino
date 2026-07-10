<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MiniCourseEnrollment extends Model
{
    protected $fillable = [
        'mini_course_id',
        'user_id',
        'order_id',
        'enrollment_number',
        'enrolled_at',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
    ];

    public function miniCourse(): BelongsTo
    {
        return $this->belongsTo(MiniCourse::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
