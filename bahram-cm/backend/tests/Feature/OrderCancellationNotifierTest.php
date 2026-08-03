<?php

namespace Tests\Feature;

use App\Enums\OrderCancellationReason;
use App\Enums\SmsEventKey;
use App\Models\Order;
use App\Models\Product;
use App\Models\SmsEventConfig;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Services\OrderCancellationNotifier;
use Database\Seeders\SmsCenterSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrderCancellationNotifierTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(SmsCenterSeeder::class);
    }

    public function test_sends_order_cancelled_sms_when_event_enabled(): void
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

        SmsEventConfig::forKey(SmsEventKey::OrderCancelled)?->update([
            'is_enabled' => true,
            'message_template' => 'سلام {name}، سفارش {order_number} لغو شد. {site_url}',
            'fallback_enabled' => false,
        ]);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'ok'],
                'entries' => [],
            ], 200),
        ]);

        $product = Product::create([
            'title' => 'دوره آزمایشی',
            'slug' => 'test-course',
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'BC-CANCEL-1',
            'product_id' => $product->id,
            'customer_name' => 'کاربر تست',
            'customer_phone' => '09121112233',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        app(OrderCancellationNotifier::class)->notify($order, OrderCancellationReason::ExpiredTtl);

        $this->assertDatabaseHas('sms_logs', [
            'event_key' => SmsEventKey::OrderCancelled->value,
            'mobile' => '09121112233',
            'status' => 'sent',
        ]);
    }

    public function test_does_not_notify_for_replaced_checkout_reason(): void
    {
        $product = Product::create([
            'title' => 'دوره',
            'slug' => 'test-course-2',
            'type' => 'normal',
            'price' => 200_000,
            'is_active' => true,
        ]);

        $order = Order::create([
            'order_number' => 'BC-CANCEL-2',
            'product_id' => $product->id,
            'customer_name' => 'کاربر',
            'customer_phone' => '09123334455',
            'amount' => 200_000,
            'discount_amount' => 0,
            'final_amount' => 200_000,
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        app(OrderCancellationNotifier::class)->notify($order, OrderCancellationReason::ReplacedCheckout);

        $this->assertDatabaseMissing('sms_logs', [
            'event_key' => SmsEventKey::OrderCancelled->value,
            'mobile' => '09123334455',
        ]);
    }
}
