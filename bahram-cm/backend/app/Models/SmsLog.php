<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsLog extends Model
{
    protected $fillable = [
        'user_id',
        'event_key',
        'fallback_of_log_id',
        'is_fallback_attempt',
        'mobile',
        'message',
        'provider',
        'status',
        'sent_at',
        'raw_response',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'raw_response' => 'array',
        'is_fallback_attempt' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function primaryLog(): BelongsTo
    {
        return $this->belongsTo(self::class, 'fallback_of_log_id');
    }
}
