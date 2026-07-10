<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseGuardTest extends TestCase
{
    use RefreshDatabase;

    public function test_order_creation_fails_when_product_already_purchased(): void
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'campaign-writing',
            'type' => 'normal',
            'price' => 1_990_000,
            'is_active' => true,
        ]);

        $user = User::create(['name' => 'مهدی', 'mobile' => '09123456789', 'status' => 'active']);

        Order::create([
            'user_id' => $user->id,
            'order_number' => 'BC-260710-OWNED',
            'product_id' => $product->id,
            'customer_name' => 'مهدی',
            'customer_phone' => '09123456789',
            'amount' => 1_990_000,
            'discount_amount' => 0,
            'final_amount' => 1_990_000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        $response = $this->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_name' => 'مهدی',
            'customer_phone' => '09123456789',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonPath('error.details.product_id.0', 'شما قبلاً این محصول را خریداری کرده‌اید.');
    }
}
