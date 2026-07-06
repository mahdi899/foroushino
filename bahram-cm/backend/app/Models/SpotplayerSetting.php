<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class SpotplayerSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'spotplayer_api_key',
        'spotplayer_base_url',
        'is_spotplayer_active',
        'default_license_duration',
    ];

    protected $casts = [
        'spotplayer_api_key' => 'encrypted',
        'is_spotplayer_active' => 'boolean',
        'default_license_duration' => 'integer',
    ];

    public function isReady(): bool
    {
        return $this->is_spotplayer_active && filled($this->spotplayer_api_key);
    }
}
