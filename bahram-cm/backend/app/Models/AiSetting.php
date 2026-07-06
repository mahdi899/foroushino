<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class AiSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'provider_name',
        'api_key',
        'base_url',
        'model',
        'temperature',
        'max_tokens',
        'is_active',
        'system_default_prompt',
    ];

    protected $casts = [
        'api_key' => 'encrypted',
        'temperature' => 'float',
        'max_tokens' => 'integer',
        'is_active' => 'boolean',
    ];

    public function isReady(): bool
    {
        return $this->is_active && filled($this->api_key);
    }
}
