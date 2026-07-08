<?php

namespace App\Models;

use App\Enums\SmsChannelType;
use Illuminate\Database\Eloquent\Model;

class SmsProvider extends Model
{
    protected $fillable = [
        'slug',
        'label_fa',
        'channel_type',
        'docs_url',
        'credentials',
        'sender_number',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'credentials' => 'encrypted',
        'is_active' => 'boolean',
        'channel_type' => SmsChannelType::class,
    ];

    public function isReady(): bool
    {
        if (! $this->is_active || blank($this->credentials)) {
            return false;
        }

        if ($this->channelType() === SmsChannelType::Sms) {
            return filled($this->sender_number) || in_array($this->slug, ['kavenegar'], true);
        }

        return true;
    }

    public function channelType(): SmsChannelType
    {
        return $this->channel_type ?? SmsChannelType::Sms;
    }
}
