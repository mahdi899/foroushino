<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class SmsSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'sms_provider',
        'primary_provider_slug',
        'fallback_provider_slug',
        'fallback_delay_seconds',
        'fallback_enabled',
        'sms_api_key',
        'sms_sender_number',
        'sms_pattern_code',
        'is_sms_active',
        'test_phone',
        'admin_telegram_enabled',
        'admin_telegram_chat_ids',
        'purchase_message_template',
    ];

    protected $casts = [
        'sms_api_key' => 'encrypted',
        'is_sms_active' => 'boolean',
        'fallback_enabled' => 'boolean',
        'admin_telegram_enabled' => 'boolean',
    ];

    public function isReady(): bool
    {
        if (! $this->is_sms_active) {
            return false;
        }

        $slug = $this->primary_provider_slug ?? $this->sms_provider ?? 'melipayamak';

        $provider = SmsProvider::query()->where('slug', $slug)->where('is_active', true)->first();

        if ($provider?->isReady()) {
            return true;
        }

        return filled($this->sms_api_key);
    }
}
