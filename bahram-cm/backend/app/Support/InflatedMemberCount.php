<?php

namespace App\Support;

/**
 * Public-facing member count: real + bonus (bonus shrinks as members grow).
 * O(1), deterministic — same formula as frontend displayedFamilyCount.ts.
 */
final class InflatedMemberCount
{
    public static function calculate(int $memberCount): int
    {
        $count = max(0, (int) floor($memberCount));

        if ($count === 0) {
            return 0;
        }

        if ($count >= 1000) {
            return $count;
        }

        $bonus = $count < 10
            ? 100 - $count
            : ($count < 100
                ? 500 - $count
                : max(0, 550 - intdiv($count, 2)));

        $raw = $count + $bonus;
        $rounded = (int) (round($raw / 10) * 10);

        return min(990, max(100, $rounded));
    }
}
