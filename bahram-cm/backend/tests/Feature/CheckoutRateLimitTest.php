<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class CheckoutRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        RateLimiter::clear('purchase-order');
    }

    private function product(): Product
    {
        return Product::create([
            'title' => 'محصول نرخ‌محدود',
            'slug' => 'rate-limit-'.uniqid(),
            'type' => 'package',
            'price' => 500000,
            'is_active' => true,
        ]);
    }

    private function orderPayload(Product $product, string $phone): array
    {
        return [
            'product_id' => $product->id,
            'customer_name' => 'خریدار تست',
            'customer_phone' => $phone,
        ];
    }

    private function asProxiedClient(string $clientIp): static
    {
        return $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->withHeaders([
                'X-Forwarded-For' => $clientIp,
                'X-Real-IP' => $clientIp,
            ]);
    }

    public function test_different_client_ips_use_independent_order_buckets(): void
    {
        config([
            'bahram.purchase_rate_limits.order_per_minute' => 2,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        $product = $this->product();

        $this->asProxiedClient('203.0.113.10')
            ->postJson('/api/orders', $this->orderPayload($product, '09121110001'))
            ->assertCreated();
        $this->asProxiedClient('203.0.113.10')
            ->postJson('/api/orders', $this->orderPayload($product, '09121110001'))
            ->assertCreated();
        $this->asProxiedClient('203.0.113.10')
            ->postJson('/api/orders', $this->orderPayload($product, '09121110001'))
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'too_many_requests');

        $this->asProxiedClient('203.0.113.11')
            ->postJson('/api/orders', $this->orderPayload($product, '09121110002'))
            ->assertCreated();
    }

    public function test_authenticated_users_with_same_ip_have_separate_buckets(): void
    {
        config([
            'bahram.purchase_rate_limits.order_per_minute' => 2,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        $product = $this->product();
        $userA = User::factory()->create(['mobile' => '09122220001', 'is_admin' => false]);
        $userB = User::factory()->create(['mobile' => '09122220002', 'is_admin' => false]);
        $tokenA = $userA->createToken('test', ['student'])->plainTextToken;
        $tokenB = $userB->createToken('test', ['student'])->plainTextToken;

        foreach ([1, 2] as $_) {
            $this->asProxiedClient('203.0.113.50')
                ->withToken($tokenA)
                ->postJson('/api/orders', $this->orderPayload($product, $userA->mobile))
                ->assertCreated();
        }

        $this->asProxiedClient('203.0.113.50')
            ->withToken($tokenA)
            ->postJson('/api/orders', $this->orderPayload($product, $userA->mobile))
            ->assertStatus(429);

        $this->asProxiedClient('203.0.113.50')
            ->withToken($tokenB)
            ->postJson('/api/orders', $this->orderPayload($product, $userB->mobile))
            ->assertCreated();
    }

    public function test_payment_request_rate_limit_is_per_actor_not_shared(): void
    {
        config([
            'bahram.purchase_rate_limits.payment_per_minute' => 2,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        PaymentSetting::current()->update([
            'is_active' => true,
            'sandbox_mode' => true,
            'zarinpal_merchant_id' => '00000000-0000-0000-0000-000000000000',
            'currency' => 'IRT',
        ]);

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A00000000000000000000000000000000001'],
                'errors' => [],
            ], 200),
        ]);

        $product = $this->product();
        $orderA = Order::create([
            'order_number' => 'BC-RL-A',
            'product_id' => $product->id,
            'customer_name' => 'A',
            'customer_phone' => '09123330001',
            'amount' => 500000,
            'discount_amount' => 0,
            'final_amount' => 500000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);
        $orderB = Order::create([
            'order_number' => 'BC-RL-B',
            'product_id' => $product->id,
            'customer_name' => 'B',
            'customer_phone' => '09123330002',
            'amount' => 500000,
            'discount_amount' => 0,
            'final_amount' => 500000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        $this->asProxiedClient('203.0.113.60')
            ->postJson('/api/payments/zarinpal/request', ['order_id' => $orderA->id])
            ->assertOk();
        $this->asProxiedClient('203.0.113.60')
            ->postJson('/api/payments/zarinpal/request', ['order_id' => $orderA->id])
            ->assertOk();
        $this->asProxiedClient('203.0.113.60')
            ->postJson('/api/payments/zarinpal/request', ['order_id' => $orderA->id])
            ->assertStatus(429)
            ->assertJsonPath('error.code', 'too_many_requests');

        $this->asProxiedClient('203.0.113.61')
            ->postJson('/api/payments/zarinpal/request', ['order_id' => $orderB->id])
            ->assertOk();
    }

    public function test_guest_mobiles_have_independent_otp_route_buckets(): void
    {
        config([
            'bahram.otp.dev_mode' => true,
            'bahram.purchase_rate_limits.guest_otp_per_minute' => 2,
            'bahram.purchase_rate_limits.global_per_minute' => 3000,
        ]);

        $product = $this->product();

        $this->asProxiedClient('203.0.113.70')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'مهمان یک',
                'customer_phone' => '09124440001',
            ])->assertOk();
        $this->asProxiedClient('203.0.113.70')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'مهمان یک',
                'customer_phone' => '09124440001',
            ])->assertOk();
        $this->asProxiedClient('203.0.113.70')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'مهمان یک',
                'customer_phone' => '09124440001',
            ])->assertStatus(429);

        $this->asProxiedClient('203.0.113.71')
            ->postJson('/api/orders/guest-checkout/send-otp', [
                'product_id' => $product->id,
                'customer_name' => 'مهمان دو',
                'customer_phone' => '09124440002',
            ])->assertOk();
    }

    public function test_concurrent_create_lock_rejects_second_caller(): void
    {
        $product = $this->product();
        $phone = '09125550001';
        $lockKey = 'purchase_create:'.hash('sha256', $phone).':'.$product->id;

        $lock = Cache::lock($lockKey, 10);
        $this->assertTrue($lock->get());

        try {
            $this->postJson('/api/orders', $this->orderPayload($product, $phone))
                ->assertUnprocessable();
        } finally {
            $lock->release();
        }
    }
}
