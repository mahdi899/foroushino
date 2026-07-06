<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\SmsSetting;
use App\Services\SmsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SmsServiceTest extends TestCase
{
    use RefreshDatabase;

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
        SmsSetting::current()->update([
            'is_sms_active' => true,
            'sms_api_key' => 'test-kavenegar-key',
            'sms_sender_number' => '10001234',
            'purchase_message_template' => 'سلام {name}، سفارش {order_number} با موفقیت ثبت شد.',
        ]);

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
        SmsSetting::current()->update([
            'is_sms_active' => true,
            'sms_api_key' => 'test-kavenegar-key',
        ]);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 400, 'message' => 'invalid receptor'],
            ], 200),
        ]);

        $order = $this->makeOrder();
        $sent = app(SmsService::class)->sendPurchaseConfirmation($order);

        $this->assertFalse($sent);
    }
}
