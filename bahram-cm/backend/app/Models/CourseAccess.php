<?php

namespace App\Models;

use App\Enums\CourseAccessSource;
use App\Enums\CourseAccessStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CourseAccess extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'order_id',
        'status',
        'access_type',
        'source',
        'activated_at',
        'deactivated_at',
    ];

    protected $casts = [
        'status' => CourseAccessStatus::class,
        'source' => CourseAccessSource::class,
        'activated_at' => 'datetime',
        'deactivated_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function spotplayerLicense(): HasOne
    {
        return $this->hasOne(SpotplayerLicense::class);
    }

    public function isActive(): bool
    {
        return $this->status === CourseAccessStatus::Active;
    }
}
