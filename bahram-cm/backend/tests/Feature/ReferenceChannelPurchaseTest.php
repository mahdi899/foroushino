<?php

namespace Tests\Feature;

use App\Jobs\FulfillOrderJob;
use App\Models\Order;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Services\ReferenceChannelPricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReferenceChannelPurchaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_quote_uses_max_seminar_discount_not_sum(): void
    {
        $user = User::factory()->create(['mobile' => '09121110001']);

        $channel = $this->makeChannel(30_000_000);

        $zafer = $this->makeSeminar('زعفرانیه', 20_000_000);
        $kamer = $this->makeSeminar('کامرانیه', 10_000_000);

        SeminarAttendee::create([
            'seminar_id' => $zafer->id,
            'user_id' => $user->id,
            'attendance_status' => 'registered',
        ]);
        SeminarAttendee::create([
            'seminar_id' => $kamer->id,
            'user_id' => $user->id,
            'attendance_status' => 'registered',
        ]);

        $quote = app(ReferenceChannelPricingService::class)->quote($channel, $user);

        $this->assertSame(30_000_000, $quote['amount']);
        $this->assertSame(20_000_000, $quote['seminar_discount']);
        $this->assertSame(10_000_000, $quote['final_amount']);
        $this->assertTrue($quote['seminar_off']);
    }

    public function test_order_uses_reference_channel_pricing(): void
    {
        $user = User::factory()->create(['mobile' => '09121110002']);
        $channel = $this->makeChannel(30_000_000);
        $seminar = $this->makeSeminar('زعفرانیه', 5_000_000);
        SeminarAttendee::create([
            'seminar_id' => $seminar->id,
            'user_id' => $user->id,
            'attendance_status' => 'attended',
        ]);

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'product_id' => $channel->product_id,
            'customer_name' => $user->name,
            'customer_phone' => $user->mobile,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('orders', [
            'product_id' => $channel->product_id,
            'user_id' => $user->id,
            'amount' => 30_000_000,
            'final_amount' => 25_000_000,
        ]);
    }

    public function test_fulfillment_creates_entitlement_not_course_access(): void
    {
        $user = User::factory()->create(['mobile' => '09121110003']);
        $channel = $this->makeChannel(1_000_000);

        $order = Order::create([
            'user_id' => $user->id,
            'order_number' => 'BC-TEST-REF-1',
            'product_id' => $channel->product_id,
            'customer_name' => $user->name,
            'customer_phone' => $user->mobile,
            'amount' => 1_000_000,
            'discount_amount' => 0,
            'final_amount' => 1_000_000,
            'status' => 'paid',
            'payment_status' => 'paid',
        ]);

        (new FulfillOrderJob($order->id))->handle(
            app(\App\Services\SpotPlayerService::class),
            app(\App\Services\SmsService::class),
            app(\App\Services\ReferralService::class),
            app(\App\Services\DiscountService::class),
            app(\App\Services\InAppNotificationService::class),
            app(\App\Services\AdminTelegramLogService::class),
        );

        $this->assertDatabaseHas('reference_channel_entitlements', [
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'order_id' => $order->id,
        ]);

        $this->assertDatabaseMissing('course_accesses', [
            'user_id' => $user->id,
            'product_id' => $channel->product_id,
        ]);
    }

    public function test_duplicate_purchase_is_rejected(): void
    {
        $user = User::factory()->create(['mobile' => '09121110004']);
        $channel = $this->makeChannel(1_000_000);

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'source' => 'admin',
        ]);

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'product_id' => $channel->product_id,
            'customer_name' => $user->name,
            'customer_phone' => $user->mobile,
        ]);

        $response->assertUnprocessable();
    }

    private function makeChannel(int $price): ReferenceChannel
    {
        $product = Product::create([
            'title' => 'کانال مرجع',
            'slug' => 'reference-main-'.uniqid(),
            'type' => Product::TYPE_REFERENCE_CHANNEL,
            'price' => $price,
            'is_active' => true,
            'show_in_telegram' => true,
            'telegram_list_visibility' => 'public',
        ]);

        return ReferenceChannel::create([
            'title' => 'کانال مرجع',
            'slug' => 'main-'.uniqid(),
            'status' => 'published',
            'price' => $price,
            'product_id' => $product->id,
        ]);
    }

    private function makeSeminar(string $title, int $discount): Seminar
    {
        $product = Product::create([
            'title' => $title,
            'slug' => 'seminar-'.uniqid(),
            'type' => 'event',
            'price' => 100000,
            'is_active' => true,
        ]);

        return Seminar::create([
            'title' => $title,
            'date' => now()->subDay(),
            'status' => 'published',
            'product_id' => $product->id,
            'price' => 100000,
            'reference_discount_amount' => $discount,
        ]);
    }
}
