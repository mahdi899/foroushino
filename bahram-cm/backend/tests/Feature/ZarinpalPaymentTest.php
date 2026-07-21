<?php

namespace Tests\Feature;

use App\Jobs\FulfillOrderJob;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Services\Exceptions\PaymentException;
use App\Services\ZarinpalPaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ZarinpalPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder(): Order
    {
        $product = Product::create([
            'title' => 'دوره آزمایشی',
            'type' => 'package',
            'price' => 1000000,
            'is_active' => true,
        ]);

        return Order::create([
            'order_number' => 'BC-TEST-0001',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09120000000',
            'amount' => 1000000,
            'discount_amount' => 0,
            'final_amount' => 1000000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
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

    public function test_request_throws_when_payment_gateway_is_not_configured(): void
    {
        $order = $this->makeOrder();

        $this->expectException(PaymentException::class);

        app(ZarinpalPaymentService::class)->request($order);
    }

    public function test_request_throws_in_dev_mode_when_payment_gateway_is_not_configured(): void
    {
        config(['bahram.payment.dev_mode' => true]);

        $order = $this->makeOrder();

        $this->expectException(PaymentException::class);

        app(ZarinpalPaymentService::class)->request($order);
    }

    public function test_dev_mode_uses_real_gateway_when_payment_settings_are_ready(): void
    {
        config(['bahram.payment.dev_mode' => true]);
        $this->activateSandbox();
        $order = $this->makeOrder();

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A00000000000000000000000000000000000'],
                'errors' => [],
            ], 200),
        ]);

        $service = app(ZarinpalPaymentService::class);
        $payment = $service->request($order);

        $this->assertSame('pending', $payment->status);
        $this->assertStringStartsWith('A', $payment->authority);
        $this->assertStringContainsString(
            'sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000000000000',
            $service->getPaymentUrl($payment),
        );
    }

    public function test_request_creates_a_pending_payment_and_returns_the_gateway_url(): void
    {
        $this->activateSandbox();
        $order = $this->makeOrder();

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A00000000000000000000000000000000000'],
                'errors' => [],
            ], 200),
        ]);

        $service = app(ZarinpalPaymentService::class);
        $payment = $service->request($order);

        $this->assertSame('pending', $payment->status);
        $this->assertSame('A00000000000000000000000000000000000', $payment->authority);
        $this->assertStringContainsString(
            'sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000000000000',
            $service->getPaymentUrl($payment)
        );

        Http::assertSent(fn ($request) => $request->url() === 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
            && $request['amount'] === 10_000_000 // Toman -> Rial conversion (x10)
            && $request['metadata']['mobile'] === '09120000000'
            && $request['metadata']['order_id'] === 'BC-TEST-0001'
            && str_ends_with((string) $request['callback_url'], '/api/payments/zarinpal/callback')
            && ! str_contains((string) $request['callback_url'], '127.0.0.1')
            && ! array_key_exists('email', $request['metadata'] ?? [])
            && ! array_key_exists('card_pan', $request['metadata'] ?? [])
        );
    }

    public function test_verify_marks_order_as_paid_and_dispatches_fulfillment(): void
    {
        Queue::fake();
        $this->activateSandbox();
        $order = $this->makeOrder();

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A11111111111111111111111111111111111'],
            ], 200),
            'sandbox.zarinpal.com/pg/v4/payment/verify.json' => Http::response([
                'data' => ['code' => 100, 'ref_id' => 123456789],
            ], 200),
        ]);

        $service = app(ZarinpalPaymentService::class);
        $service->request($order);

        $result = $service->verify('A11111111111111111111111111111111111');

        $this->assertTrue($result['success']);
        $this->assertSame(123456789, $result['ref_id']);

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertSame('paid', $order->payment_status);

        Queue::assertPushed(FulfillOrderJob::class, fn ($job) => $job->orderId === $order->id);
    }

    public function test_verify_marks_order_as_failed_when_gateway_rejects_the_transaction(): void
    {
        Queue::fake();
        $this->activateSandbox();
        $order = $this->makeOrder();

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A22222222222222222222222222222222222'],
            ], 200),
            'sandbox.zarinpal.com/pg/v4/payment/verify.json' => Http::response([
                'data' => ['code' => -21],
                'errors' => ['message' => 'تراکنش ناموفق بود.'],
            ], 200),
        ]);

        $service = app(ZarinpalPaymentService::class);
        $service->request($order);
        $result = $service->verify('A22222222222222222222222222222222222');

        $this->assertFalse($result['success']);

        $order->refresh();
        $this->assertSame('failed', $order->status);
        $this->assertSame('failed', $order->payment_status);

        Queue::assertNotPushed(FulfillOrderJob::class);
    }

    public function test_verify_fails_gracefully_for_an_unknown_authority(): void
    {
        $this->activateSandbox();

        $result = app(ZarinpalPaymentService::class)->verify('does-not-exist');

        $this->assertFalse($result['success']);
        $this->assertNull($result['order']);
    }

    public function test_cancel_by_authority_marks_pending_payment_as_canceled(): void
    {
        $this->activateSandbox();
        $order = $this->makeOrder();

        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A33333333333333333333333333333333333'],
            ], 200),
        ]);

        $service = app(ZarinpalPaymentService::class);
        $payment = $service->request($order);

        $resolved = $service->cancelByAuthority($payment->authority);

        $this->assertNotNull($resolved);
        $this->assertSame($order->id, $resolved->id);
        $payment->refresh();
        $this->assertSame('canceled', $payment->status);
        $this->assertSame('pending_payment', $resolved->status);
    }
}
