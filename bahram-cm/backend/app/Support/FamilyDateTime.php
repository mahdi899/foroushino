<?php

namespace App\Support;

use Carbon\CarbonInterface;

/**
 * Canonical ISO-8601 serialization for Family API timestamps.
 * Always emits an absolute instant with explicit offset (Asia/Tehran wall clock).
 */
final class FamilyDateTime
{
    public static function toApi(?CarbonInterface $dt): ?string
    {
        if ($dt === null) {
            return null;
        }

        return $dt->copy()
            ->timezone((string) config('app.timezone', 'Asia/Tehran'))
            ->toIso8601String();
    }
}
