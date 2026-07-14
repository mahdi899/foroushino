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
            'lead_pool_auto_return_hours' => 48,
            'payout_minimum_amount' => 100_000,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function allKeyed(): array
    {
        $stored = self::query()->pluck('value', 'key')->map(function ($value) {
            return is_array($value) && array_key_exists('v', $value) ? $value['v'] : $value;
        })->all();

        return array_merge(self::defaults(), $stored);
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
