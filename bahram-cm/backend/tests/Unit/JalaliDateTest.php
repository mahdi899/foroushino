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
}
