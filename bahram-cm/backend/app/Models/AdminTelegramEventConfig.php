<?php

namespace App\Models;

use App\Enums\AdminTelegramEventKey;
use Illuminate\Database\Eloquent\Model;

class AdminTelegramEventConfig extends Model
{
    protected $fillable = [
        'event_key',
        'label_fa',
        'description',
        'is_enabled',
        'sort_order',
    ];

    protected $casts = [
        'is_enabled' => 'boolean',
    ];

    public static function forKey(AdminTelegramEventKey|string $key): ?self
    {
        $value = $key instanceof AdminTelegramEventKey ? $key->value : $key;

        return static::query()->where('event_key', $value)->first();
    }

    public function eventKey(): ?AdminTelegramEventKey
    {
        return AdminTelegramEventKey::tryFrom($this->event_key);
    }
}
