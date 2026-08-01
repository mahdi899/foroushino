<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PendingOrderDedupTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_checkout_cancels_prior_pending_order_for_same_product_and_phone(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'dedup-course-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $user = User::create(['name' => 'علی', 'mobile' => '09121112233', 'status' => 'active']);

        $first = app(OrderService::class)->create([
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09121112233',
        ], $user);

        $second = app(OrderService::class)->create([
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09121112233',
        ], $user);

        $this->assertSame('cancelled', $first->fresh()->status);
        $this->assertSame('pending_payment', $second->fresh()->status);
        $this->assertSame(1, Order::query()
            ->where('product_id', $product->id)
            ->where('customer_phone', '09121112233')
            ->where('status', 'pending_payment')
            ->count());
    }

    public function test_api_order_store_replaces_open_pending_checkout(): void
    {
        $product = Product::create([
            'title' => 'محصول API',
            'slug' => 'dedup-api-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $payload = [
            'product_id' => $product->id,
            'customer_name' => 'رضا',
            'customer_phone' => '09123334455',
        ];

        $first = $this->postJson('/api/orders', $payload)->assertCreated()->json('data.order_number');
        $second = $this->postJson('/api/orders', $payload)->assertCreated()->json('data.order_number');

        $this->assertNotSame($first, $second);
        $this->assertSame('cancelled', Order::query()->where('order_number', $first)->value('status'));
        $this->assertSame('pending_payment', Order::query()->where('order_number', $second)->value('status'));
    }

    public function test_paid_order_is_not_cancelled_when_user_checks_out_again(): void
    {
        $product = Product::create([
            'title' => 'محصول پرداخت‌شده',
            'slug' => 'dedup-paid-'.uniqid(),
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $paid = Order::create([
            'order_number' => 'BC-TEST-PAID',
            'product_id' => $product->id,
            'customer_name' => 'سارا',
            'customer_phone' => '09125556677',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $response = $this->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_name' => 'سارا',
            'customer_phone' => '09125556677',
        ]);

        $response->assertUnprocessable();
        $this->assertSame('paid', $paid->fresh()->status);
    }
}
