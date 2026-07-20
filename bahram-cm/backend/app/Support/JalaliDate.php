<?php

namespace App\Support;

use Carbon\Carbon;
use DateTimeInterface;
use IntlDateFormatter;

final class JalaliDate
{
    /**
     * Parse Jalali (or Gregorian if year >= 1700) datetime like 1403-05-15 12:30:00.
     */
    public static function parseDateTime(string $input): ?Carbon
    {
        $input = trim($input);
        if (! preg_match(
            '/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/',
            $input,
            $m,
        )) {
            return null;
        }

        $y = (int) $m[1];
        $mo = (int) $m[2];
        $d = (int) $m[3];
        $h = (int) ($m[4] ?? 23);
        $i = (int) ($m[5] ?? 59);
        $s = (int) ($m[6] ?? 59);

        if ($y >= 1700) {
            return Carbon::create($y, $mo, $d, $h, $i, $s, 'Asia/Tehran');
        }

        [$gy, $gm, $gd] = self::toGregorian($y, $mo, $d);

        return Carbon::create($gy, $gm, $gd, $h, $i, $s, 'Asia/Tehran');
    }

    /** @return array{0: int, 1: int, 2: int} */
    private static function toGregorian(int $jy, int $jm, int $jd): array
    {
        $gy = ($jy <= 979) ? 621 : 1600;
        $jy -= ($jy <= 979) ? 0 : 979;
        $days = (365 * $jy)
            + (intdiv($jy, 33) * 8)
            + intdiv((($jy % 33) + 3), 4)
            + 78
            + $jd
            + (($jm < 7) ? ($jm - 1) * 31 : (($jm - 7) * 30 + 186));
        $gy += 400 * intdiv($days, 146097);
        $days %= 146097;
        if ($days > 36524) {
            $gy += 100 * intdiv(--$days, 36524);
            $days %= 36524;
            if ($days >= 365) {
                $days++;
            }
        }
        $gy += 4 * intdiv($days, 1461);
        $days %= 1461;
        if ($days > 365) {
            $gy += intdiv($days - 1, 365);
            $days = ($days - 1) % 365;
        }
        $gd = $days + 1;
        $sal_a = [0, 31, (($gy % 4 === 0 && $gy % 100 !== 0) || ($gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        $gm = 0;
        for ($gm = 1; $gm <= 12 && $gd > $sal_a[$gm]; $gm++) {
            $gd -= $sal_a[$gm];
        }

        return [$gy, $gm, $gd];
    }

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

    /** Persian (Jalali) date + time, e.g. «۳ مرداد ۱۴۰۵ — ۱۹:۴۶». */
    public static function formatDateTime(?DateTimeInterface $date = null): string
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
                'd MMMM y – HH:mm',
            );

            $formatted = $formatter->format($date);
            if (is_string($formatted) && $formatted !== '') {
                return $formatted;
            }
        }

        return self::format($date).' '.$date->format('H:i');
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
