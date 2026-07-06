<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class ChatbotSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'is_enabled',
        'bot_name',
        'welcome_message',
        'system_prompt',
        'response_structure',
        'fallback_message',
        'collect_name_enabled',
        'collect_phone_enabled',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'collect_name_enabled' => 'boolean',
        'collect_phone_enabled' => 'boolean',
    ];
}
