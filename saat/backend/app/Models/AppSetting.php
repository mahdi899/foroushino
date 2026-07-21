<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];

    protected function casts(): array
    {
        return [
            'value' => 'array',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'call_lock_minutes' => 30,
            'min_call_duration_sec' => 0,
            'native_call_enabled' => true,
            'voip_enabled' => false,
            'default_call_method' => 'native',
            'voip_provider' => 'asterisk',
            'voip_fallback_to_native' => true,
            'lead_pool_auto_return_hours' => 48,
            'power_dial_default' => false,
            'qa_sample_percent' => 10,
            'payout_minimum_amount' => 100_000,
            'meli_pattern_course' => 11111,
            'meli_pattern_channel' => 11111,
            'meli_pattern_register' => 11111,
            'meli_pattern_payment' => 11111,
            'meli_pattern_custom' => 11111,
            'meli_pattern_login' => 0,
            'meli_sms_link_course' => 'https://rostami.app/courses',
            'meli_sms_link_channel' => 'https://t.me/RostamiAppBot',
            'meli_sms_link_register' => 'https://rostami.app/register',
            'meli_sms_link_payment' => 'https://rostami.app/payment',
            'melipayamak_username' => '',
            'melipayamak_password' => '',
            'melipayamak_rest_url' => 'https://rest.payamak-panel.com/api/SendSMS',
            'bahram_callback_url' => 'https://rostami.app/api/v1/integrations/inbound/sat-status',
            'bahram_callback_token' => '',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function allKeyed(): array
    {
        return Cache::remember('app_settings_keyed', 60, function (): array {
            $defaults = self::defaults();

            $stored = self::query()->pluck('value', 'key')->map(function ($value) {
                return is_array($value) && array_key_exists('v', $value) ? $value['v'] : $value;
            })->all();

            $merged = $defaults;

            foreach ($stored as $key => $value) {
                $key = (string) $key;

                if (str_starts_with($key, 'meli_') && ($value === '' || $value === null)) {
                    continue;
                }

                if (in_array($key, ['melipayamak_username', 'melipayamak_password', 'melipayamak_rest_url', 'bahram_callback_token'], true)
                    && ($value === '' || $value === null)) {
                    continue;
                }

                $merged[$key] = $value;
            }

            return $merged;
        });
    }

    public static function int(string $key, int $default = 0): int
    {
        return (int) (self::allKeyed()[$key] ?? $default);
    }

    public static function bool(string $key, bool $default = false): bool
    {
        $value = self::allKeyed()[$key] ?? $default;

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    public static function string(string $key, string $default = ''): string
    {
        return (string) (self::allKeyed()[$key] ?? $default);
    }

    /**
     * @return array{username: string, password: string, rest_url: string}
     */
    public static function melipayamakConfig(): array
    {
        $username = self::string('melipayamak_username');
        $password = self::string('melipayamak_password');
        $restUrl = self::string('melipayamak_rest_url');

        return [
            'username' => $username !== '' ? $username : (string) config('melipayamak.username'),
            'password' => $password !== '' ? $password : (string) config('melipayamak.password'),
            'rest_url' => $restUrl !== ''
                ? $restUrl
                : (string) config('melipayamak.rest_url', 'https://rest.payamak-panel.com/api/SendSMS'),
        ];
    }

    public static function melipayamakPasswordConfigured(): bool
    {
        $config = self::melipayamakConfig();

        return $config['password'] !== '';
    }

    public static function bahramCallbackTokenConfigured(): bool
    {
        $token = self::string('bahram_callback_token');
        if ($token !== '') {
            return true;
        }

        return trim((string) config('security.bahram_callback.token', '')) !== '';
    }

    public static function callLockMinutes(): int
    {
        return max(1, self::int('call_lock_minutes', 30));
    }

    /**
     * @return array<string, mixed>
     */
    public static function telephonyConfig(): array
    {
        $settings = self::allKeyed();

        return [
            'native_call_enabled' => filter_var($settings['native_call_enabled'] ?? true, FILTER_VALIDATE_BOOLEAN),
            'voip_enabled' => filter_var($settings['voip_enabled'] ?? false, FILTER_VALIDATE_BOOLEAN),
            'default_call_method' => (string) ($settings['default_call_method'] ?? 'native'),
            'voip_provider' => (string) ($settings['voip_provider'] ?? 'asterisk'),
            'voip_fallback_to_native' => filter_var($settings['voip_fallback_to_native'] ?? true, FILTER_VALIDATE_BOOLEAN),
        ];
    }

    /**
     * @param  array<string, mixed>  $settings
     */
    public static function syncMany(array $settings): void
    {
        foreach ($settings as $key => $value) {
            self::query()->updateOrCreate(
                ['key' => (string) $key],
                ['value' => ['v' => $value]],
            );
        }

        Cache::forget('app_settings_keyed');
    }
}
