<?php

namespace App\Support;

use Illuminate\Support\Carbon;

/** Calendar-day helpers — always use app timezone (Asia/Tehran). */
class BusinessDate
{
    public static function timezone(): string
    {
        return (string) config('app.timezone', 'Asia/Tehran');
    }

    public static function now(): Carbon
    {
        return now();
    }

    public static function today(): Carbon
    {
        return today();
    }

    public static function startOfDay(?Carbon $day = null): Carbon
    {
        return ($day ?? static::today())->copy()->startOfDay();
    }

    public static function endOfDay(?Carbon $day = null): Carbon
    {
        return ($day ?? static::today())->copy()->endOfDay();
    }

    public static function dateKey(?Carbon $moment = null): string
    {
        return ($moment ?? static::now())->toDateString();
    }

    public static function sqlDateTime(Carbon $moment): string
    {
        return "'".$moment->format('Y-m-d H:i:s')."'";
    }
}
