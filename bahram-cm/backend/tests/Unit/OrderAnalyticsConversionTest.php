<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Product;
use App\Services\OrderAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAnalyticsConversionTest extends TestCase
{
    use RefreshDatabase;

    public function test_conversion_rate_uses_all_orders_including_cancelled(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'conv-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        foreach (['BC-C1', 'BC-C2'] as $number) {
            Order::create([
                'order_number' => $number,
                'product_id' => $product->id,
                'customer_name' => 'علی',
                'customer_phone' => '09120001111',
                'amount' => 200_000,
                'discount_amount' => 0,
                'final_amount' => 200_000,
                'status' => 'paid',
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);
        }

        Order::create([
            'order_number' => 'BC-C3',
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09120002222',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        Order::create([
            'order_number' => 'BC-C4',
            'product_id' => $product->id,
            'customer_name' => 'سارا',
            'customer_phone' => '09120003333',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'cancelled',
            'payment_status' => 'failed',
        ]);

        $report = app(OrderAnalyticsService::class)->report(null);

        $this->assertSame(3, $report['summary']['total_orders']);
        $this->assertSame(4, $report['summary']['all_orders']);
        $this->assertSame(1, $report['summary']['pending_orders']);
        $this->assertSame(2, $report['summary']['paid_orders']);
        $this->assertSame(50.0, $report['summary']['conversion_rate']);
    }
}
