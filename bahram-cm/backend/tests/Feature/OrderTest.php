<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ReferralCode;
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

    public function test_guest_order_can_be_created_with_phone_only(): void
    {
        $product = Product::create([
            'title' => 'دوره آزمایشی',
            'type' => 'normal',
            'price' => 500000,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_phone' => '09351234567',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('orders', [
            'product_id' => $product->id,
            'customer_phone' => '09351234567',
            'customer_name' => Order::PLACEHOLDER_CUSTOMER_NAME,
        ]);
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

    public function test_authenticated_user_cannot_use_own_referral_code_on_order(): void
    {
        $product = Product::create([
            'title' => 'دوره آزمایشی',
            'type' => 'normal',
            'price' => 500000,
            'is_active' => true,
        ]);

        $user = \App\Models\User::factory()->create([
            'mobile' => '09351234567',
        ]);

        ReferralCode::create([
            'user_id' => $user->id,
            'code' => 'BRM-12345',
            'is_active' => true,
        ]);

        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withToken($token)->postJson('/api/orders', [
            'product_id' => $product->id,
            'customer_phone' => '09351234567',
            'ref' => 'BRM-12345',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonPath('error.details.ref.0', 'نمی‌توانید از کد معرف خودتان استفاده کنید.');
        $this->assertDatabaseCount('orders', 0);
    }
}
