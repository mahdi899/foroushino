<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\OrderAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAnalyticsFunnelTest extends TestCase
{
    use RefreshDatabase;

    public function test_pre_gateway_dropout_counts_orders_without_payment_attempt(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'funnel-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-F1',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09120001111',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        Order::create([
            'order_number' => 'BC-F2',
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09120002222',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        $paid = Order::create([
            'order_number' => 'BC-F3',
            'product_id' => $product->id,
            'customer_name' => 'سارا',
            'customer_phone' => '09120003333',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'order_id' => $paid->id,
            'gateway' => 'zarinpal',
            'authority' => 'A-PAID',
            'amount' => 200_000,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $summary = app(OrderAnalyticsService::class)->report(null)['summary'];

        $this->assertSame(2, $summary['pre_gateway_dropout_count']);
        $this->assertSame(66.7, $summary['pre_gateway_dropout_rate']);
    }

    public function test_gateway_abandonment_rate_is_share_of_all_orders_not_payment_attempts(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'gw-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $paid = Order::create([
            'order_number' => 'BC-G1',
            'product_id' => $product->id,
            'customer_name' => 'سارا',
            'customer_phone' => '09120001111',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'order_id' => $paid->id,
            'gateway' => 'zarinpal',
            'authority' => 'A-PAID',
            'amount' => 200_000,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $abandoned = Order::create([
            'order_number' => 'BC-G2',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09120002222',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        Payment::create([
            'order_id' => $abandoned->id,
            'gateway' => 'zarinpal',
            'authority' => 'A-CANCEL',
            'amount' => 200_000,
            'status' => 'canceled',
        ]);

        Payment::create([
            'order_id' => $abandoned->id,
            'gateway' => 'zarinpal',
            'authority' => 'A-FAIL',
            'amount' => 200_000,
            'status' => 'failed',
        ]);

        $pending = Order::create([
            'order_number' => 'BC-G3',
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09120003333',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        Payment::create([
            'order_id' => $pending->id,
            'gateway' => 'zarinpal',
            'authority' => 'A-PEND',
            'amount' => 200_000,
            'status' => 'pending',
        ]);

        Order::create([
            'order_number' => 'BC-G4',
            'product_id' => $product->id,
            'customer_name' => 'مینا',
            'customer_phone' => '09120004444',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        $summary = app(OrderAnalyticsService::class)->report(null)['summary'];

        $this->assertSame(4, $summary['all_orders']);
        $this->assertSame(1, $summary['paid_orders']);
        $this->assertSame(1, $summary['pre_gateway_dropout_count']);
        $this->assertSame(1, $summary['gateway_abandoned_count']);
        $this->assertSame(1, $summary['gateway_pending_order_count']);
        $this->assertSame(25.0, $summary['conversion_rate']);
        $this->assertSame(25.0, $summary['pre_gateway_dropout_rate']);
        $this->assertSame(25.0, $summary['gateway_abandonment_rate']);
        $this->assertSame(25.0, $summary['gateway_pending_rate']);
        $this->assertSame(100.0, round(
            $summary['conversion_rate']
            + $summary['pre_gateway_dropout_rate']
            + $summary['gateway_abandonment_rate']
            + $summary['gateway_pending_rate'],
            1,
        ));
    }
}
