<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Services\OrderAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAnalyticsGatewayTest extends TestCase
{
    use RefreshDatabase;

    public function test_gateway_breakdown_includes_zarinpal_and_card_to_card(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'gw-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $zarinpalOrder = Order::create([
            'order_number' => 'BC-Z1',
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

        Payment::create([
            'order_id' => $zarinpalOrder->id,
            'gateway' => 'zarinpal',
            'authority' => 'A-1',
            'amount' => 200_000,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $c2cOrder = Order::create([
            'order_number' => 'BC-C1',
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09120002222',
            'amount' => 150_000,
            'discount_amount' => 0,
            'final_amount' => 150_000,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'customer_extra_data' => [
                'card_to_card' => ['status' => 'approved'],
            ],
        ]);

        Payment::create([
            'order_id' => $c2cOrder->id,
            'gateway' => 'card_to_card',
            'authority' => 'c2c-'.$c2cOrder->id,
            'amount' => 150_000,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $legacyC2cOrder = Order::create([
            'order_number' => 'BC-C2',
            'product_id' => $product->id,
            'customer_name' => 'سارا',
            'customer_phone' => '09120003333',
            'amount' => 100_000,
            'discount_amount' => 0,
            'final_amount' => 100_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'customer_extra_data' => [
                'card_to_card' => ['status' => 'approved'],
            ],
        ]);

        Payment::create([
            'order_id' => $legacyC2cOrder->id,
            'gateway' => 'c2c',
            'authority' => 'c2c-'.$legacyC2cOrder->id,
            'amount' => 100_000,
            'status' => 'paid',
            'paid_at' => now(),
        ]);

        $report = app(OrderAnalyticsService::class)->report(null);
        $byKey = collect($report['by_gateway'])->keyBy('key');

        $this->assertSame(1, $byKey['zarinpal']['count']);
        $this->assertSame(200_000, $byKey['zarinpal']['revenue']);
        $this->assertSame('زرین‌پال', $byKey['zarinpal']['label']);

        $this->assertSame(2, $byKey['card_to_card']['count']);
        $this->assertSame(250_000, $byKey['card_to_card']['revenue']);
        $this->assertSame('کارت به کارت', $byKey['card_to_card']['label']);
    }

    public function test_gateway_breakdown_falls_back_to_card_to_card_extra_when_payment_missing(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'gw-fb-'.uniqid(),
            'type' => 'normal',
            'price' => 300_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-C3',
            'product_id' => $product->id,
            'customer_name' => 'مینا',
            'customer_phone' => '09120004444',
            'amount' => 300_000,
            'discount_amount' => 0,
            'final_amount' => 300_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
            'customer_extra_data' => [
                'card_to_card' => ['status' => 'approved'],
            ],
        ]);

        $report = app(OrderAnalyticsService::class)->report(null);
        $byKey = collect($report['by_gateway'])->keyBy('key');

        $this->assertSame(1, $byKey['card_to_card']['count']);
        $this->assertSame(300_000, $byKey['card_to_card']['revenue']);
    }
}
