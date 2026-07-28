<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ExpirePendingOrdersTest extends TestCase
{
    use RefreshDatabase;

    public function test_stale_pending_orders_are_cancelled_after_ttl(): void
    {
        Carbon::setTestNow('2026-07-29 12:00:00');

        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 200000,
            'is_active' => true,
        ]);

        $stale = Order::create([
            'order_number' => 'BC-260729-STALE',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000001',
            'amount' => 200000,
            'discount_amount' => 0,
            'final_amount' => 200000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);
        $stale->forceFill([
            'created_at' => now()->subMinutes(61),
            'updated_at' => now()->subMinutes(61),
        ])->saveQuietly();

        Payment::create([
            'order_id' => $stale->id,
            'gateway' => 'zarinpal',
            'authority' => 'A00000000000000000000000000000000001',
            'amount' => 200000,
            'status' => 'pending',
        ]);

        $fresh = Order::create([
            'order_number' => 'BC-260729-FRESH',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000002',
            'amount' => 200000,
            'discount_amount' => 0,
            'final_amount' => 200000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);
        $fresh->forceFill([
            'created_at' => now()->subMinutes(30),
            'updated_at' => now()->subMinutes(30),
        ])->saveQuietly();

        $this->artisan('orders:expire-pending', ['--skip-purge' => true])
            ->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $stale->id,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        $this->assertDatabaseHas('payments', [
            'order_id' => $stale->id,
            'status' => 'canceled',
        ]);

        $this->assertDatabaseHas('orders', [
            'id' => $fresh->id,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);
    }

    public function test_cancelled_orders_are_purged_after_retention_window(): void
    {
        Carbon::setTestNow('2026-07-29 12:00:00');

        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 200000,
            'is_active' => true,
        ]);

        $oldCancelled = Order::create([
            'order_number' => 'BC-260720-OLDCL',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000003',
            'amount' => 200000,
            'discount_amount' => 0,
            'final_amount' => 200000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);
        $oldCancelled->forceFill([
            'created_at' => now()->subDays(10),
            'updated_at' => now()->subDays(8),
        ])->saveQuietly();

        Payment::create([
            'order_id' => $oldCancelled->id,
            'gateway' => 'zarinpal',
            'authority' => 'A00000000000000000000000000000000002',
            'amount' => 200000,
            'status' => 'canceled',
        ]);

        $recentCancelled = Order::create([
            'order_number' => 'BC-260728-NEWCL',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000004',
            'amount' => 200000,
            'discount_amount' => 0,
            'final_amount' => 200000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);
        $recentCancelled->forceFill([
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ])->saveQuietly();

        $paid = Order::create([
            'order_number' => 'BC-260720-PAID',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000005',
            'amount' => 200000,
            'discount_amount' => 0,
            'final_amount' => 200000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now()->subDays(10),
        ]);
        $paid->forceFill([
            'created_at' => now()->subDays(10),
            'updated_at' => now()->subDays(10),
        ])->saveQuietly();

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertDatabaseMissing('orders', ['id' => $oldCancelled->id]);
        $this->assertDatabaseMissing('payments', ['order_id' => $oldCancelled->id]);
        $this->assertDatabaseHas('orders', ['id' => $recentCancelled->id, 'status' => 'cancelled']);
        $this->assertDatabaseHas('orders', ['id' => $paid->id, 'status' => 'paid']);
    }

    public function test_paid_orders_are_never_expired_or_purged(): void
    {
        Carbon::setTestNow('2026-07-29 12:00:00');

        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 200000,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'BC-260728-SAFE',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000006',
            'amount' => 200000,
            'discount_amount' => 0,
            'final_amount' => 200000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
            'paid_at' => now()->subHours(2),
        ]);
        $order->forceFill([
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ])->saveQuietly();

        $this->artisan('orders:expire-pending')->assertSuccessful();

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'status' => 'pending_payment',
        ]);
    }
}
