<?php

namespace Tests\Unit;

use App\Support\JalaliDate;
use Carbon\Carbon;
use PHPUnit\Framework\TestCase;

class JalaliDateTest extends TestCase
{
    public function test_format_datetime_uses_persian_calendar_not_gregorian_slash_format(): void
    {
        $formatted = JalaliDate::formatDateTime(
            Carbon::parse('2026-07-24 19:46:00', 'Asia/Tehran'),
        );

        $this->assertStringNotContainsString('2026/07/24', $formatted);
        $this->assertMatchesRegularExpression('/\d/u', $formatted);
        $this->assertStringContainsString(':', $formatted);
    }

    public function test_format_api_uses_latin_unpadded_jalali_date(): void
    {
        // 1992-03-21 ≈ 1371/1/1 (Nowruz 1371)
        $formatted = JalaliDate::formatApi(
            Carbon::parse('1992-03-21 12:00:00', 'Asia/Tehran'),
        );

        $this->assertSame('1371/1/1', $formatted);
        $this->assertMatchesRegularExpression('/^[0-9]+\/[0-9]+\/[0-9]+$/', $formatted);
    }

    public function test_format_api_from_date_string_converts_gregorian_ymd_without_timezone_shift(): void
    {
        $this->assertSame('1371/1/1', JalaliDate::formatApiFromDateString('1992-03-21'));
        $this->assertSame('1375/7/16', JalaliDate::formatApiFromDateString('1996-10-07'));
        $this->assertSame('1371/1/1', JalaliDate::formatApiFromDateString('1371/01/01'));
        $this->assertSame('1371/1/1', JalaliDate::formatApiFromDateString('1371/1/1'));
    }
}
