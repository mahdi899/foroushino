<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\SmsEventConfig;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Services\SmsService;
use Database\Seeders\SmsCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmsServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SmsCenterSeeder::class);
    }

    private function configureKavenegar(): void
    {
        SmsProvider::query()->where('slug', 'kavenegar')->first()?->update([
            'is_active' => true,
            'credentials' => 'test-kavenegar-key',
            'sender_number' => '10001234',
        ]);

        SmsSetting::current()->update([
            'is_sms_active' => true,
            'primary_provider_slug' => 'kavenegar',
            'sms_provider' => 'kavenegar',
            'sms_api_key' => 'test-kavenegar-key',
            'sms_sender_number' => '10001234',
            'fallback_enabled' => false,
        ]);

        SmsEventConfig::forKey('purchase_confirmation')?->update([
            'is_enabled' => true,
            'message_template' => 'سلام {name}، سفارش {order_number} با موفقیت ثبت شد.',
            'fallback_enabled' => false,
        ]);
    }

    private function makeOrder(): Order
    {
        $product = Product::create([
            'title' => 'دوره آزمایشی',
            'type' => 'package',
            'price' => 500000,
            'is_active' => true,
        ]);

        return Order::create([
            'order_number' => 'BC-TEST-SMS-1',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09121112233',
            'amount' => 500000,
            'discount_amount' => 0,
            'final_amount' => 500000,
            'status' => 'paid',
            'payment_status' => 'paid',
        ]);
    }

    public function test_purchase_confirmation_sms_is_sent_when_configured(): void
    {
        $this->configureKavenegar();

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $order = $this->makeOrder();

        $sent = app(SmsService::class)->sendPurchaseConfirmation($order);

        $this->assertTrue($sent);
        Http::assertSent(fn ($request) => str_contains($request->url(), 'test-kavenegar-key')
            && $request['receptor'] === '09121112233'
        );
    }

    public function test_sms_is_not_sent_when_the_service_is_not_configured(): void
    {
        // SmsSetting left at its inactive default.
        Http::fake();

        $order = $this->makeOrder();
        $sent = app(SmsService::class)->sendPurchaseConfirmation($order);

        $this->assertFalse($sent);
        Http::assertNothingSent();
    }

    public function test_sms_send_failure_is_handled_gracefully(): void
    {
        $this->configureKavenegar();

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 400, 'message' => 'invalid receptor'],
            ], 200),
        ]);

        $order = $this->makeOrder();
        $sent = app(SmsService::class)->sendPurchaseConfirmation($order);

        $this->assertFalse($sent);
    }

    public function test_send_test_returns_provider_code_on_failure(): void
    {
        $this->configureKavenegar();

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 418, 'message' => 'invalid receptor'],
            ], 200),
        ]);

        $result = app(SmsService::class)->sendTest('09121112233');

        $this->assertFalse($result['success']);
        $this->assertSame('status: 418 · invalid receptor', $result['provider_code']);
    }

    public function test_send_test_returns_provider_code_on_success(): void
    {
        $this->configureKavenegar();

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $result = app(SmsService::class)->sendTest('09121112233');

        $this->assertTrue($result['success']);
        $this->assertSame('status: 200 · ok', $result['provider_code']);
    }

    public function test_send_event_test_returns_provider_response(): void
    {
        $this->configureKavenegar();

        SmsSetting::current()->update(['test_phone' => '09121112233']);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $result = app(SmsService::class)->sendEventTest(
            \App\Enums\SmsEventKey::Otp,
            ['message_template' => 'کد تست: {code}'],
        );

        $this->assertTrue($result['ok']);
        $this->assertStringContainsString('status: 200 · ok', $result['message']);
    }

    public function test_send_event_test_requires_test_phone(): void
    {
        $this->configureKavenegar();

        SmsSetting::current()->update(['test_phone' => null]);

        $result = app(SmsService::class)->sendEventTest(\App\Enums\SmsEventKey::Otp);

        $this->assertFalse($result['ok']);
        $this->assertSame('شماره موبایل گیرنده را وارد کنید.', $result['message']);
    }

    public function test_send_event_test_accepts_phone_override(): void
    {
        $this->configureKavenegar();

        SmsSetting::current()->update(['test_phone' => null]);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $result = app(SmsService::class)->sendEventTest(
            \App\Enums\SmsEventKey::Otp,
            ['phone' => '09121112233', 'message_template' => 'کد تست: {code}'],
        );

        $this->assertTrue($result['ok']);
    }
}
