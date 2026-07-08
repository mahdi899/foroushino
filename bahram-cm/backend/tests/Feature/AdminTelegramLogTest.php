<?php

namespace Tests\Feature;

use App\Enums\AdminTelegramEventKey;
use App\Models\AdminTelegramEventConfig;
use App\Models\Order;
use App\Models\Product;
use App\Models\SmsProvider;
use App\Models\SmsSetting;
use App\Models\User;
use App\Services\AdminTelegramLogService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminTelegramLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        SmsProvider::query()->updateOrCreate(
            ['slug' => 'telegram'],
            [
                'label_fa' => 'ربات تلگرام',
                'credentials' => 'test-bot-token',
                'is_active' => true,
            ],
        );

        SmsSetting::current()->update([
            'admin_telegram_enabled' => true,
            'admin_telegram_chat_ids' => '123456789',
        ]);

        $this->seed(\Database\Seeders\AdminTelegramSeeder::class);
    }

    public function test_order_created_sends_admin_telegram_message(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]]),
        ]);

        $product = Product::create([
            'title' => 'دوره تست',
            'slug' => 'test-course',
            'type' => 'normal',
            'price' => 1_000_000,
            'is_active' => true,
        ]);
        $order = Order::create([
            'order_number' => 'BC-TEST-00001',
            'product_id' => $product->id,
            'customer_name' => 'علی',
            'customer_phone' => '09121112233',
            'amount' => 1_000_000,
            'discount_amount' => 0,
            'final_amount' => 1_000_000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        app(AdminTelegramLogService::class)->sendNow(AdminTelegramEventKey::OrderCreated, ['order' => $order->load('product')]);

        Http::assertSent(function ($request) {
            $body = $request->data();

            return str_contains($request->url(), 'sendMessage')
                && ($body['chat_id'] ?? null) === '123456789'
                && str_contains($body['text'] ?? '', 'سفارش جدید')
                && str_contains($body['text'] ?? '', 'BC-TEST-00001');
        });
    }

    public function test_disabled_event_skips_send(): void
    {
        Http::fake();

        AdminTelegramEventConfig::forKey(AdminTelegramEventKey::OrderCreated)?->update(['is_enabled' => false]);

        $order = Order::create([
            'order_number' => 'BC-TEST-00002',
            'customer_name' => 'رضا',
            'customer_phone' => '09123334455',
            'amount' => 500_000,
            'discount_amount' => 0,
            'final_amount' => 500_000,
            'status' => 'pending_payment',
            'payment_status' => 'pending',
        ]);

        $sent = app(AdminTelegramLogService::class)->sendNow(AdminTelegramEventKey::OrderCreated, ['order' => $order]);

        $this->assertFalse($sent);
        Http::assertNothingSent();
    }

    public function test_send_test_builds_and_sends_message(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 3]]),
        ]);

        $result = app(AdminTelegramLogService::class)->sendTest();

        $this->assertTrue($result['success']);
        $this->assertStringContainsString('پیام آزمایشی', $result['message']);
        Http::assertSent(function ($request) {
            $text = $request->data()['text'] ?? '';

            return str_contains($text, 'پیام سفارشی هست از تیم توسعه‌دهنده')
                && str_contains($text, '💖')
                && ! str_contains($text, 'BC-TEST')
                && ! preg_match('/\d{1,2}:\d{2}/', $text);
        });
    }

    public function test_student_registered_message_includes_mobile(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 2]]),
        ]);

        AdminTelegramEventConfig::forKey(AdminTelegramEventKey::StudentRegistered)?->update(['is_enabled' => true]);

        $user = User::create(['name' => 'دانشجو', 'mobile' => '09125556677', 'status' => 'active']);

        app(AdminTelegramLogService::class)->sendNow(AdminTelegramEventKey::StudentRegistered, ['user' => $user]);

        Http::assertSent(function ($request) {
            return str_contains($request->data()['text'] ?? '', '09125556677');
        });
    }
}
