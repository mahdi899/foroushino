<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GuestCheckoutOtpTest extends TestCase
{
    use RefreshDatabase;

    private function makeProduct(): Product
    {
        return Product::create([
            'title' => 'دوره آزمایشی',
            'type' => 'package',
            'price' => 1000000,
            'is_active' => true,
        ]);
    }

    private function activateSandbox(): void
    {
        PaymentSetting::current()->update([
            'is_active' => true,
            'sandbox_mode' => true,
            'zarinpal_merchant_id' => '00000000-0000-0000-0000-000000000000',
            'currency' => 'IRT',
        ]);
    }

    public function test_guest_checkout_send_otp_returns_checkout_token(): void
    {
        config(['bahram.otp.dev_mode' => true]);
        $product = $this->makeProduct();

        $response = $this->postJson('/api/orders/guest-checkout/send-otp', [
            'product_id' => $product->id,
            'customer_name' => 'کاربر مهمان',
            'customer_phone' => '09121234567',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.otp_sent', true)
            ->assertJsonStructure(['data' => ['checkout_token', 'customer_phone_masked']]);
    }

    public function test_guest_checkout_verify_and_pay_creates_order_and_returns_gateway_url(): void
    {
        config(['bahram.otp.dev_mode' => true]);
        $this->activateSandbox();
        $product = $this->makeProduct();

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A00000000000000000000000000000000000'],
            ], 200),
        ]);

        $send = $this->postJson('/api/orders/guest-checkout/send-otp', [
            'product_id' => $product->id,
            'customer_name' => 'کاربر مهمان',
            'customer_phone' => '09121234567',
        ])->assertOk();

        $token = $send->json('data.checkout_token');

        $verify = $this->postJson('/api/orders/guest-checkout/verify-and-pay', [
            'checkout_token' => $token,
            'code' => (string) config('bahram.otp.dev_code', '12345'),
        ]);

        $verify
            ->assertOk()
            ->assertJsonStructure(['data' => ['payment_url', 'order_number', 'authority']]);

        $this->assertStringContainsString(
            'sandbox.zarinpal.com/pg/StartPay/',
            (string) $verify->json('data.payment_url'),
        );

        $this->assertDatabaseHas('orders', [
            'customer_phone' => '09121234567',
            'customer_name' => 'کاربر مهمان',
            'status' => 'pending_payment',
        ]);
    }

    public function test_guest_checkout_verify_rejects_invalid_code(): void
    {
        config(['bahram.otp.dev_mode' => false]);
        $product = $this->makeProduct();

        $send = $this->postJson('/api/orders/guest-checkout/send-otp', [
            'product_id' => $product->id,
            'customer_name' => 'کاربر مهمان',
            'customer_phone' => '09121234567',
        ])->assertOk();

        $this->postJson('/api/orders/guest-checkout/verify-and-pay', [
            'checkout_token' => $send->json('data.checkout_token'),
            'code' => '00000',
        ])->assertStatus(422)
            ->assertJsonPath('error.code', 'otp_invalid');
    }
}
