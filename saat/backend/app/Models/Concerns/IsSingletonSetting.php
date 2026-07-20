<?php

namespace App\Models\Concerns;

/**
 * Helper for single-row "settings" tables. Always operates on the first row,
 * creating it with defaults when missing.
 */
trait IsSingletonSetting
{
    public static function current(): static
    {
        return static::query()->firstOrCreate([]);
    }
}
