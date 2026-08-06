<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Product;
use App\Services\OrderAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAnalyticsDiscountTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_order_with_full_coupon_counts_zero_revenue_not_list_price(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'discount-analytics-'.uniqid(),
            'type' => 'normal',
            'price' => 2_000_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-FREE-'.uniqid(),
            'product_id' => $product->id,
            'customer_name' => 'کاربر رایگان',
            'customer_phone' => '09120009999',
            'amount' => 2_000_000,
            'discount_amount' => 2_000_000,
            'coupon_discount_amount' => 2_000_000,
            'coupon_code' => 'FREE100',
            'final_amount' => 0,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        Order::create([
            'order_number' => 'BC-PAID-'.uniqid(),
            'product_id' => $product->id,
            'customer_name' => 'کاربر پرداخت‌کننده',
            'customer_phone' => '09120008888',
            'amount' => 2_000_000,
            'discount_amount' => 500_000,
            'coupon_discount_amount' => 500_000,
            'coupon_code' => 'HALF50',
            'final_amount' => 1_500_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $report = app(OrderAnalyticsService::class)->report(null);

        $this->assertSame(2, $report['summary']['paid_orders']);
        $this->assertSame(1_500_000, $report['summary']['total_revenue']);
        $this->assertSame(750_000, $report['summary']['avg_order_value']);

        $byProduct = collect($report['by_product'])->firstWhere('product_id', $product->id);
        $this->assertNotNull($byProduct);
        $this->assertSame(2, $byProduct['count']);
        $this->assertSame(1_500_000, $byProduct['revenue']);
    }
}
