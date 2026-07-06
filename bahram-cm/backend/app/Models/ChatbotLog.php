<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatbotLog extends Model
{
    protected $fillable = [
        'session_id',
        'ip_address',
        'user_agent',
        'question',
        'answer',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];
}
