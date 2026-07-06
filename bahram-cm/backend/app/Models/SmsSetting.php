<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class SmsSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'sms_provider',
        'sms_api_key',
        'sms_sender_number',
        'sms_pattern_code',
        'is_sms_active',
        'test_phone',
        'purchase_message_template',
    ];

    protected $casts = [
        'sms_api_key' => 'encrypted',
        'is_sms_active' => 'boolean',
    ];

    public function isReady(): bool
    {
        return $this->is_sms_active && filled($this->sms_api_key);
    }
}
