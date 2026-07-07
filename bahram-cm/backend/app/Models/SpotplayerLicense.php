<?php

namespace App\Models;

use App\Enums\SpotplayerLicenseStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpotplayerLicense extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'order_id',
        'course_access_id',
        'spotplayer_course_id',
        'license_key',
        'license_url',
        'device_limit',
        'status',
        'raw_response',
    ];

    protected $casts = [
        'status' => SpotplayerLicenseStatus::class,
        'device_limit' => 'integer',
        'raw_response' => 'array',
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

    public function courseAccess(): BelongsTo
    {
        return $this->belongsTo(CourseAccess::class);
    }
}
