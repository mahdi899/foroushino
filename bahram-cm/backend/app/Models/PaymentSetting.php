<?php

namespace App\Models;

use App\Models\Concerns\IsSingletonSetting;
use Illuminate\Database\Eloquent\Model;

class PaymentSetting extends Model
{
    use IsSingletonSetting;

    protected $fillable = [
        'zarinpal_merchant_id',
        'sandbox_mode',
        'callback_url',
        'is_active',
        'currency',
        'description_template',
    ];

    protected $casts = [
        'zarinpal_merchant_id' => 'encrypted',
        'sandbox_mode' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function isReady(): bool
    {
        return $this->is_active && filled($this->zarinpal_merchant_id);
    }
}
