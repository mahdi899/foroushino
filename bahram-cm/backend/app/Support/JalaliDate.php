<?php

namespace App\Support;

use Carbon\Carbon;
use DateTimeInterface;
use IntlDateFormatter;

final class JalaliDate
{
    public static function format(?DateTimeInterface $date = null): string
    {
        $date = $date
            ? Carbon::instance($date)->timezone('Asia/Tehran')
            : now()->timezone('Asia/Tehran');

        if (class_exists(IntlDateFormatter::class)) {
            $formatter = new IntlDateFormatter(
                'fa_IR@calendar=persian',
                IntlDateFormatter::NONE,
                IntlDateFormatter::NONE,
                'Asia/Tehran',
                IntlDateFormatter::TRADITIONAL,
                'yyyy/MM/dd',
            );

            $formatted = $formatter->format($date);
            if (is_string($formatted) && $formatted !== '') {
                return $formatted;
            }
        }

        [$jy, $jm, $jd] = self::toJalali(
            (int) $date->year,
            (int) $date->month,
            (int) $date->day,
        );

        return sprintf('%04d/%02d/%02d', $jy, $jm, $jd);
    }

    /** @return array{0: int, 1: int, 2: int} */
    private static function toJalali(int $gy, int $gm, int $gd): array
    {
        $gDaysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        $jy = ($gy <= 1600) ? 0 : 979;
        $gy -= ($gy <= 1600) ? 621 : 1600;
        $gy2 = ($gm > 2) ? ($gy + 1) : $gy;
        $days = (365 * $gy)
            + intdiv($gy2 + 3, 4)
            - intdiv($gy2 + 99, 100)
            + intdiv($gy2 + 399, 400)
            - 80
            + $gd
            + array_sum(array_slice($gDaysInMonth, 0, $gm));

        $jy += 33 * intdiv($days, 12053);
        $days %= 12053;
        $jy += 4 * intdiv($days, 1461);
        $days %= 1461;

        if ($days > 365) {
            $jy += intdiv($days - 1, 365);
            $days = ($days - 1) % 365;
        }

        if ($days < 186) {
            $jm = 1 + intdiv($days, 31);
            $jd = 1 + ($days % 31);

            return [$jy, $jm, $jd];
        }

        $days -= 186;
        $jm = 7 + intdiv($days, 30);
        $jd = 1 + ($days % 30);

        return [$jy, $jm, $jd];
    }
}
