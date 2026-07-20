<?php

namespace App\Support;

use DateTimeImmutable;
use DateTimeInterface;
use DateTimeZone;

/**
 * Public-facing member count: real count × 10, ones digit = Iran hour % 10 (e.g. 9 → 90 at 00:xx).
 */
final class InflatedMemberCount
{
    public static function hourInIran(?DateTimeInterface $at = null): int
    {
        $tz = new DateTimeZone('Asia/Tehran');

        if ($at !== null) {
            return (int) DateTimeImmutable::createFromInterface($at)->setTimezone($tz)->format('G');
        }

        return (int) (new DateTimeImmutable('now', $tz))->format('G');
    }

    public static function calculate(int $memberCount, ?int $hour = null): int
    {
        $base = max(0, (int) floor($memberCount));
        $hour ??= self::hourInIran();

        return $base * 10 + ($hour % 10);
    }
}
