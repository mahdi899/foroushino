<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Product;
use App\Services\OrderAnalyticsService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAnalyticsDailyTest extends TestCase
{
    use RefreshDatabase;

    public function test_daily_trend_groups_by_paid_at_not_created_at(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-03 12:00:00', 'Asia/Tehran'));

        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'daily-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-D1',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09120001111',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'created_at' => Carbon::parse('2026-08-01 10:00:00', 'Asia/Tehran'),
            'paid_at' => Carbon::parse('2026-08-03 09:00:00', 'Asia/Tehran'),
        ]);

        $report = app(OrderAnalyticsService::class)->report(7);
        $byDate = collect($report['daily'])->keyBy('date');

        $this->assertSame(0, $byDate->get('2026-08-01')['paid_orders'] ?? 0);
        $this->assertSame(1, $byDate->get('2026-08-03')['paid_orders'] ?? 0);
        $this->assertSame(200_000, $byDate->get('2026-08-03')['revenue'] ?? 0);

        Carbon::setTestNow();
    }

    public function test_daily_trend_fills_missing_days_with_zero(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-08-03 12:00:00', 'Asia/Tehran'));

        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'daily-fill-'.uniqid(),
            'type' => 'normal',
            'price' => 100_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-D2',
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09120002222',
            'amount' => 100_000,
            'discount_amount' => 0,
            'final_amount' => 100_000,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'created_at' => Carbon::parse('2026-08-01 08:00:00', 'Asia/Tehran'),
            'paid_at' => Carbon::parse('2026-08-01 08:30:00', 'Asia/Tehran'),
        ]);

        $report = app(OrderAnalyticsService::class)->report(3);
        $byDate = collect($report['daily'])->keyBy('date');

        $this->assertCount(3, $report['daily']);
        $this->assertSame(1, $byDate->get('2026-08-01')['paid_orders'] ?? 0);
        $this->assertSame(0, $byDate->get('2026-08-02')['paid_orders'] ?? 0);
        $this->assertSame(0, $byDate->get('2026-08-03')['paid_orders'] ?? 0);

        Carbon::setTestNow();
    }
}
