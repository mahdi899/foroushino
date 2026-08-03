<?php

namespace Tests\Feature;

use App\Models\PaymentSetting;
use App\Models\Product;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Mockery;
use Tests\TestCase;

class GuestCheckoutOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    private function makeProduct(): Product
    {
        return Product::create([
            'title' => 'دوره آزمایشی',
            'type' => 'package',
            'price' => 1000000,
            'is_active' => true,
        ]);
    }

    private function asProxiedClient(string $clientIp): static
    {
        return $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders([
                'X-Forwarded-For' => $clientIp,
                'X-Real-IP' => $clientIp,
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

    public function test_otp_ip_limit_does_not_block_other_real_client_ips(): void
    {
        config([
            'bahram.otp.dev_mode' => true,
            'bahram.purchase_rate_limits.guest_otp_per_minute' => 100,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        $product = $this->makeProduct();

        for ($i = 1; $i <= 5; $i++) {
            $this->asProxiedClient('203.0.113.80')
                ->postJson('/api/orders/guest-checkout/send-otp', [
                    'product_id' => $product->id,
                    'customer_name' => "مهمان {$i}",
                    'customer_phone' => '09127'.str_pad((string) $i, 6, '0', STR_PAD_LEFT),
                ])->assertOk();
        }

        // Same real IP: OTP service per-IP hour cap (20) still allows more mobiles;
        // a different IP must never be blocked by the first client's bucket.
        $this->asProxiedClient('203.0.113.81')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'مهمان دیگر',
                'customer_phone' => '09128880001',
            ])->assertOk();
    }

    public function test_otp_mobile_cap_only_affects_that_mobile(): void
    {
        // Dev mode short-circuits OtpService before rate limits; exercise the real path with SMS mocked.
        config([
            'bahram.otp.dev_mode' => false,
            'bahram.purchase_rate_limits.guest_otp_per_minute' => 100,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        $sms = Mockery::mock(SmsService::class);
        $sms->shouldReceive('sendOtp')->andReturn(true);
        $sms->shouldReceive('sendOtpViaBaleSafir')->andReturn(false);
        $this->app->instance(SmsService::class, $sms);

        $product = $this->makeProduct();
        $phone = '09129990001';

        // Bypass resend cooldown between hits for the same mobile.
        for ($i = 0; $i < 5; $i++) {
            RateLimiter::clear("otp:resend:{$phone}:guest_checkout");
            $this->asProxiedClient('203.0.113.90')
                ->postJson('/api/orders/guest-checkout/send-otp', [
                    'product_id' => $product->id,
                    'customer_name' => 'سقف موبایل',
                    'customer_phone' => $phone,
                ])->assertOk();
        }

        RateLimiter::clear("otp:resend:{$phone}:guest_checkout");
        $this->asProxiedClient('203.0.113.90')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'سقف موبایل',
                'customer_phone' => $phone,
            ])
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'otp_rate_limited');

        $this->asProxiedClient('203.0.113.91')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'موبایل دیگر',
                'customer_phone' => '09129990002',
            ])->assertOk();
    }
}
