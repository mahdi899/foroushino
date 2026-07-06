<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatbotSession extends Model
{
    protected $fillable = [
        'session_id',
        'ip_address',
        'user_agent',
        'page_url',
        'visitor_phone',
        'visitor_first_name',
        'visitor_last_name',
        'preferred_operator_profile_id',
        'lead_id',
        'open_count',
        'message_count',
        'opened_at',
        'last_activity_at',
    ];

    protected $casts = [
        'open_count' => 'integer',
        'message_count' => 'integer',
        'opened_at' => 'datetime',
        'last_activity_at' => 'datetime',
    ];

    public function logs(): HasMany
    {
        return $this->hasMany(ChatbotLog::class, 'session_id', 'session_id');
    }
}
