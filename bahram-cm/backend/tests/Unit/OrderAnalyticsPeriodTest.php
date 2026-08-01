<?php

namespace Tests\Unit;

use App\Services\OrderAnalyticsService;
use Carbon\Carbon;
use Tests\TestCase;

class OrderAnalyticsPeriodTest extends TestCase
{
    public function test_report_uses_calendar_day_window_for_single_day(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-02 15:30:00'));

        $service = new class extends OrderAnalyticsService
        {
            public function start(?int $days): ?\Illuminate\Support\Carbon
            {
                $method = new \ReflectionMethod(OrderAnalyticsService::class, 'periodStart');
                $method->setAccessible(true);

                return $method->invoke($this, $days);
            }
        };

        $this->assertSame('2026-08-02 00:00:00', $service->start(1)?->toDateTimeString());
        $this->assertSame('2026-07-27 00:00:00', $service->start(7)?->toDateTimeString());

        Carbon::setTestNow();
    }
}
