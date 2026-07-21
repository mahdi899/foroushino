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

    /**
     * Public callback ZarinPal redirects to after payment.
     * Must be reachable from the internet — never APP_URL/loopback.
     */
    public static function defaultCallbackUrl(): string
    {
        $base = rtrim((string) config('bahram.payment.public_base_url'), '/');

        return $base.'/api/payments/zarinpal/callback';
    }

    public function resolvedCallbackUrl(): string
    {
        $stored = trim((string) $this->callback_url);

        if ($stored !== '' && ! self::isUnreachableCallbackHost($stored)) {
            return $stored;
        }

        return self::defaultCallbackUrl();
    }

    /** Loopback / local hosts cannot be used as a ZarinPal callback in production. */
    public static function isUnreachableCallbackHost(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST);
        if (! is_string($host) || $host === '') {
            return true;
        }

        $host = strtolower($host);

        return in_array($host, ['127.0.0.1', 'localhost', '::1'], true)
            || str_ends_with($host, '.local')
            || str_ends_with($host, '.test')
            || str_ends_with($host, '.localhost');
    }
}
