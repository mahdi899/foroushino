<?php

namespace Tests\Unit;

use App\Models\Order;
use App\Models\Product;
use App\Services\OrderAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderAnalyticsUniquenessTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_uniqueness_breakdown_counts_duplicate_checkouts(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'uniq-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        Order::create([
            'order_number' => 'BC-U1',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09120001111',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        Order::create([
            'order_number' => 'BC-U2',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09120001111',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        Order::create([
            'order_number' => 'BC-U3',
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09120002222',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $report = app(OrderAnalyticsService::class)->report(null);
        $byKey = collect($report['by_order_uniqueness'])->keyBy('key');

        $this->assertSame(2, $byKey['unique']['count']);
        $this->assertSame(1, $byKey['duplicate']['count']);
        $this->assertSame(400_000, $byKey['unique']['revenue']);
        $this->assertSame(0, $byKey['duplicate']['revenue']);
    }

    public function test_order_uniqueness_counts_cancelled_retries_as_duplicate(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'uniq-cancel-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        foreach (['BC-C1', 'BC-C2', 'BC-C3'] as $number) {
            Order::create([
                'order_number' => $number,
                'product_id' => $product->id,
                'customer_name' => 'علی',
                'customer_phone' => '09120003333',
                'amount' => 200_000,
                'discount_amount' => 0,
                'final_amount' => 200_000,
                'status' => 'cancelled',
                'payment_status' => 'canceled',
            ]);
        }

        Order::create([
            'order_number' => 'BC-C4',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09120003333',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'fulfilled',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $report = app(OrderAnalyticsService::class)->report(null);
        $byKey = collect($report['by_order_uniqueness'])->keyBy('key');

        $this->assertSame(1, $byKey['unique']['count']);
        $this->assertSame(3, $byKey['duplicate']['count']);
        $this->assertSame(200_000, $byKey['unique']['revenue']);
        $this->assertSame(0, $byKey['duplicate']['revenue']);
    }
}
