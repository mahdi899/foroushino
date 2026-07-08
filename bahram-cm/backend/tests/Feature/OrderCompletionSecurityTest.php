<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderCompletionTokenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderCompletionSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_complete_profile_requires_valid_token(): void
    {
        $order = $this->paidGuestOrder();

        $this->getJson('/api/orders/complete-profile?token=invalid-token')
            ->assertForbidden();

        $this->getJson('/api/orders/complete-profile?token='.$this->issueToken($order))
            ->assertOk()
            ->assertJsonPath('data.order_number', $order->order_number)
            ->assertJsonPath('data.customer_phone_masked', '0935***4567');
    }

    public function test_order_number_alone_cannot_access_complete_profile(): void
    {
        $order = $this->paidGuestOrder();

        $this->getJson('/api/orders/'.$order->order_number.'/complete-profile')
            ->assertNotFound();
    }

    public function test_complete_customer_requires_valid_token_and_revokes_it(): void
    {
        $order = $this->paidGuestOrder();
        $token = $this->issueToken($order);

        $this->postJson('/api/orders/complete-customer', [
            'completion_token' => $token,
            'customer_name' => 'علی رضایی',
        ])
            ->assertOk()
            ->assertJsonPath('data.completed', true)
            ->assertJsonStructure(['data' => ['post_login_token', 'customer_phone_masked', 'otp_sent']]);

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'customer_name' => 'علی رضایی',
        ]);

        $this->getJson('/api/orders/complete-profile?token='.$token)
            ->assertForbidden();
    }

    public function test_post_payment_verify_otp_logs_in_without_reentering_phone(): void
    {
        $order = $this->paidGuestOrder();
        $token = $this->issueToken($order);

        $response = $this->postJson('/api/orders/complete-customer', [
            'completion_token' => $token,
            'customer_name' => 'علی رضایی',
        ])->assertOk();

        $postLoginToken = $response->json('data.post_login_token');
        $this->assertNotEmpty($postLoginToken);

        $this->postJson('/api/orders/post-payment-login/verify-otp', [
            'post_login_token' => $postLoginToken,
            'code' => '12345',
        ])
            ->assertOk()
            ->assertJsonStructure(['data' => ['token']]);

        $this->postJson('/api/orders/post-payment-login/verify-otp', [
            'post_login_token' => $postLoginToken,
            'code' => '12345',
        ])->assertForbidden();
    }

    public function test_complete_customer_rejects_guessed_order_without_token(): void
    {
        $order = $this->paidGuestOrder();

        $this->postJson('/api/orders/complete-customer', [
            'order_number' => $order->order_number,
            'customer_name' => 'مهاجم',
        ])->assertUnprocessable();
    }

    private function paidGuestOrder(): Order
    {
        $product = Product::create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 500000,
            'is_active' => true,
        ]);

        $user = User::factory()->create([
            'mobile' => '09351234567',
            'name' => 'دانشجو',
        ]);

        $order = Order::create([
            'order_number' => 'BC-TEST-001',
            'product_id' => $product->id,
            'user_id' => $user->id,
            'customer_name' => Order::PLACEHOLDER_CUSTOMER_NAME,
            'customer_phone' => '09351234567',
            'amount' => 500000,
            'discount_amount' => 0,
            'final_amount' => 500000,
            'status' => 'paid',
            'payment_status' => 'paid',
            'paid_at' => now(),
        ]);

        return $order->fresh();
    }

    private function issueToken(Order $order): string
    {
        return app(OrderCompletionTokenService::class)->issue($order);
    }
}
