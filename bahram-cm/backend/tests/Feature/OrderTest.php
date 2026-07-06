<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_order_can_be_created_for_an_active_product(): void
    {
        $product = Product::create([
            'title' => 'پکیج آزمایشی',
            'type' => 'package',
            'price' => 1000000,
            'sale_price' => 800000,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_name' => 'زهرا احمدی',
            'customer_phone' => '09351234567',
            'customer_email' => 'zahra@example.com',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.amount', 1000000);
        $response->assertJsonPath('data.final_amount', 800000);
        $response->assertJsonPath('data.discount_amount', 200000);
        $response->assertJsonPath('data.status', 'pending_payment');
        $response->assertJsonPath('data.payment_status', 'pending');

        $this->assertDatabaseHas('orders', [
            'product_id' => $product->id,
            'customer_phone' => '09351234567',
            'final_amount' => 800000,
        ]);
    }

    public function test_order_creation_fails_for_an_inactive_product(): void
    {
        $product = Product::create([
            'title' => 'محصول غیرفعال',
            'type' => 'normal',
            'price' => 500000,
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000000',
        ]);

        $response->assertUnprocessable();
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_creation_requires_a_valid_product_id(): void
    {
        $response = $this->postJson('/api/orders', [
            'product_id' => 999,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000000',
        ]);

        $response->assertUnprocessable();
    }
}
