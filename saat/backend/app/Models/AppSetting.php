<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
            'min_call_duration_sec' => 90,
            'lead_pool_auto_return_hours' => 48,
            'payout_minimum_amount' => 100_000,
            'meli_pattern_course' => 11111,
            'meli_pattern_channel' => 11111,
            'meli_pattern_register' => 11111,
            'meli_pattern_payment' => 11111,
            'meli_pattern_custom' => 11111,
            'meli_sms_link_course' => 'https://foroushino.ir/c',
            'meli_sms_link_channel' => 'https://foroushino.ir/t',
            'meli_sms_link_register' => 'https://foroushino.ir/r',
            'meli_sms_link_payment' => 'https://foroushino.ir/p',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function allKeyed(): array
    {
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

            $merged[$key] = $value;
        }

        return $merged;
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
    }
}
