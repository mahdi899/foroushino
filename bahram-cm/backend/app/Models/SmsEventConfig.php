<?php

namespace App\Models;

use App\Enums\SmsEventKey;
use Illuminate\Database\Eloquent\Model;

class SmsEventConfig extends Model
{
    protected $fillable = [
        'event_key',
        'label_fa',
        'description',
        'is_enabled',
        'message_template',
        'pattern_code',
        'use_pattern',
        'provider_slug',
        'fallback_enabled',
        'fallback_delay_seconds',
        'sort_order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
        'use_pattern' => 'boolean',
        'fallback_enabled' => 'boolean',
    ];

    public static function forKey(SmsEventKey|string $key): ?self
    {
        $value = $key instanceof SmsEventKey ? $key->value : $key;

        return static::query()->where('event_key', $value)->first();
    }

    public function eventKey(): ?SmsEventKey
    {
        return SmsEventKey::tryFrom($this->event_key);
    }

    public function resolvedTemplate(): string
    {
        if (filled($this->message_template)) {
            return $this->message_template;
        }

        return $this->eventKey()?->defaultTemplate() ?? '';
    }
}
