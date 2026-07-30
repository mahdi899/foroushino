<?php

namespace Tests\Feature\Telegram;

use App\Jobs\ExpireCardToCardOrderJob;
use App\Jobs\FulfillOrderJob;
use App\Models\Order;
use App\Models\Product;
use App\Models\Seminar;
use App\Models\User;
use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\TelegramCardToCardFlowService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class CardToCardFlowTest extends TestCase
{
    use RefreshDatabase;

    private TelegramBot $bot;

    private FakeTelegramBotClient $fake;

    private TelegramAccount $buyer;

    private TelegramAccount $adminA;

    private TelegramAccount $adminB;

    private User $buyerUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fake = new FakeTelegramBotClient;
        $this->app->instance(FakeTelegramBotClient::class, $this->fake);

        $this->bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
            'settings' => [
                'features' => [
                    BotFeatureFlag::CardToCardPayment->value => true,
                    BotFeatureFlag::ZarinpalPayment->value => false,
                ],
                'payment_reports_chat_id' => '-100111',
                'card_to_card' => [
                    'card_number' => '6037991234567890',
                    'card_holder' => 'بهرام',
                    'bank_name' => 'ملی',
                ],
            ],
        ]);

        $this->buyerUser = User::query()->create([
            'name' => 'خریدار',
            'mobile' => '09121234567',
            'status' => 'active',
        ]);

        $this->buyer = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'user_id' => $this->buyerUser->id,
            'telegram_user_id' => 1001,
            'display_name' => 'خریدار',
            'mobile' => '09121234567',
            'mobile_verified_at' => now(),
            'is_bot_admin' => false,
        ]);

        $this->adminA = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => 2001,
            'display_name' => 'ادمین الف',
            'is_bot_admin' => true,
        ]);

        $this->adminB = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'telegram_user_id' => 2002,
            'display_name' => 'ادمین ب',
            'is_bot_admin' => true,
        ]);
    }

    public function test_bot_settings_compose_card_instructions(): void
    {
        $this->assertTrue($this->bot->hasCardToCardDetails());
        $this->assertStringContainsString('6037991234567890', $this->bot->cardToCardInstructions());
        $this->assertStringContainsString('بهرام', $this->bot->cardToCardInstructions());

        $this->bot->setCardToCardSettings(false, ['card_number' => null]);
        $this->bot->refresh();
        $this->assertFalse($this->bot->featureEnabled(BotFeatureFlag::CardToCardPayment));
    }

    public function test_checkout_requires_card_details(): void
    {
        $this->bot->forceFill([
            'settings' => [
                'features' => [
                    BotFeatureFlag::CardToCardPayment->value => true,
                    BotFeatureFlag::ZarinpalPayment->value => false,
                ],
                'payment_reports_chat_id' => '-100111',
                'card_to_card' => [],
            ],
        ])->save();
        $this->bot->refresh();
        $this->assertFalse($this->bot->hasCardToCardDetails());

        $product = Product::query()->create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 100000,
            'is_active' => true,
        ]);

        $this->expectException(ValidationException::class);
        app(TelegramCheckoutService::class)->startCardToCardCheckout($this->buyer->fresh(['bot']), $product);
    }

    public function test_start_checkout_sets_waiting_for_receipt_and_dispatches_expire_job(): void
    {
        Queue::fake();

        $product = Product::query()->create([
            'title' => 'دوره تست',
            'type' => 'normal',
            'price' => 100000,
            'is_active' => true,
        ]);

        $result = app(TelegramCheckoutService::class)->startCardToCardCheckout($this->buyer, $product);

        $this->assertSame(10, $result['ttl_minutes']);
        $order = Order::query()->findOrFail($result['order_id']);
        $this->assertSame('pending_payment', $order->status);
        $this->assertSame('waiting_for_receipt', data_get($order->customer_extra_data, 'card_to_card.status'));
        $this->assertNotEmpty(data_get($order->customer_extra_data, 'card_to_card.expires_at'));

        Queue::assertPushed(ExpireCardToCardOrderJob::class, function (ExpireCardToCardOrderJob $job) use ($order) {
            return $job->orderId === $order->id;
        });
    }

    public function test_expire_cancels_waiting_receipt_and_reopens_seminar_capacity(): void
    {
        Carbon::setTestNow('2026-07-30 12:00:00');

        $product = Product::query()->create([
            'title' => 'سمینار تست',
            'slug' => 'seminar-c2c-cap',
            'type' => 'event',
            'price' => 200000,
            'is_active' => true,
        ]);
        Seminar::query()->create([
            'title' => 'سمینار تست',
            'date' => now()->addWeek(),
            'status' => 'published',
            'product_id' => $product->id,
            'price' => 200000,
            'capacity' => 1,
        ]);

        $checkout = app(TelegramCheckoutService::class);
        $first = $checkout->startCardToCardCheckout($this->buyer, $product);
        $order = Order::query()->findOrFail($first['order_id']);

        $otherUser = User::query()->create(['name' => 'دوم', 'mobile' => '09129876543', 'status' => 'active']);
        $other = TelegramAccount::query()->create([
            'telegram_bot_id' => $this->bot->id,
            'user_id' => $otherUser->id,
            'telegram_user_id' => 1002,
            'mobile' => '09129876543',
            'mobile_verified_at' => now(),
        ]);

        try {
            $checkout->startCardToCardCheckout($other, $product);
            $this->fail('Expected capacity validation failure');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('ظرفیت', collect($e->errors())->flatten()->first() ?? '');
        }

        Carbon::setTestNow('2026-07-30 12:11:00');
        $expired = app(TelegramCardToCardFlowService::class)->expireIfWaitingForReceipt($order->id);
        $this->assertTrue($expired);
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'cancelled']);

        $second = $checkout->startCardToCardCheckout($other, $product);
        $this->assertGreaterThan(0, $second['order_id']);

        Carbon::setTestNow();
    }

    public function test_awaiting_review_is_not_expired_by_receipt_timer(): void
    {
        Carbon::setTestNow('2026-07-30 12:00:00');
        Queue::fake();

        $product = Product::query()->create([
            'title' => 'دوره',
            'type' => 'normal',
            'price' => 50000,
            'is_active' => true,
        ]);
        $result = app(TelegramCheckoutService::class)->startCardToCardCheckout($this->buyer, $product);
        $order = Order::query()->findOrFail($result['order_id']);

        app(TelegramCardToCardFlowService::class)->beginWaitingForReceipt(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            $order->id,
            (string) $product->title,
            (int) $result['amount'],
            $this->bot->cardToCardInstructions(),
            10,
        );

        app(TelegramCardToCardFlowService::class)->handleUserMessage(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            [
                'message_id' => 9,
                'photo' => [['file_id' => 'PHOTO1', 'width' => 100, 'height' => 100]],
            ],
        );

        $order->refresh();
        $this->assertSame('awaiting_review', data_get($order->customer_extra_data, 'card_to_card.status'));

        Carbon::setTestNow('2026-07-30 12:20:00');
        $this->assertFalse(app(TelegramCardToCardFlowService::class)->expireIfWaitingForReceipt($order->id));
        $this->assertDatabaseHas('orders', ['id' => $order->id, 'status' => 'pending_payment']);

        Carbon::setTestNow();
    }

    public function test_dual_admin_approve_fulfills_and_reject_cancels(): void
    {
        Bus::fake([FulfillOrderJob::class]);
        Queue::fake();

        $product = Product::query()->create([
            'title' => 'دوره',
            'type' => 'normal',
            'price' => 75000,
            'is_active' => true,
        ]);
        $result = app(TelegramCheckoutService::class)->startCardToCardCheckout($this->buyer, $product);
        $orderId = (int) $result['order_id'];

        $flow = app(TelegramCardToCardFlowService::class);
        $flow->beginWaitingForReceipt(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            $orderId,
            (string) $product->title,
            (int) $result['amount'],
            $this->bot->cardToCardInstructions(),
            10,
        );
        $flow->handleUserMessage(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            [
                'message_id' => 11,
                'photo' => [['file_id' => 'PHOTO2', 'width' => 200, 'height' => 200]],
            ],
        );

        $flow->handleAdminReviewCallback(
            $this->bot,
            $this->adminA,
            $this->fake,
            -100111,
            500,
            'cb1',
            'c2c:ok:'.$orderId,
        );

        $order = Order::query()->findOrFail($orderId);
        $this->assertSame('pending_payment', $order->status);
        $this->assertCount(1, data_get($order->customer_extra_data, 'card_to_card.approvals', []));

        $flow->handleAdminReviewCallback(
            $this->bot,
            $this->adminA,
            $this->fake,
            -100111,
            500,
            'cb2',
            'c2c:ok:'.$orderId,
        );
        $order->refresh();
        $this->assertSame('pending_payment', $order->status);
        $this->assertCount(1, data_get($order->customer_extra_data, 'card_to_card.approvals', []));

        $flow->handleAdminReviewCallback(
            $this->bot,
            $this->adminB,
            $this->fake,
            -100111,
            500,
            'cb3',
            'c2c:ok:'.$orderId,
        );

        $order->refresh();
        $this->assertSame('paid', $order->status);
        Bus::assertDispatched(FulfillOrderJob::class);

        // Reject path on a fresh order
        $result2 = app(TelegramCheckoutService::class)->startCardToCardCheckout($this->buyer, $product);
        $orderId2 = (int) $result2['order_id'];
        $flow->beginWaitingForReceipt(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            $orderId2,
            (string) $product->title,
            (int) $result2['amount'],
            $this->bot->cardToCardInstructions(),
            10,
        );
        $flow->handleUserMessage(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            [
                'message_id' => 12,
                'photo' => [['file_id' => 'PHOTO3', 'width' => 200, 'height' => 200]],
            ],
        );
        $flow->handleAdminReviewCallback(
            $this->bot,
            $this->adminA,
            $this->fake,
            -100111,
            501,
            'cb4',
            'c2c:no:'.$orderId2,
        );
        $this->assertDatabaseHas('orders', ['id' => $orderId2, 'status' => 'cancelled']);
    }

    public function test_receipt_without_payment_reports_chat_cancels_order(): void
    {
        Queue::fake();
        $this->bot->setPaymentReportsChatId(null);
        $this->bot->refresh();

        $product = Product::query()->create([
            'title' => 'دوره',
            'type' => 'normal',
            'price' => 10000,
            'is_active' => true,
        ]);
        $result = app(TelegramCheckoutService::class)->startCardToCardCheckout($this->buyer, $product);
        $orderId = (int) $result['order_id'];

        $flow = app(TelegramCardToCardFlowService::class);
        $flow->beginWaitingForReceipt(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            $orderId,
            (string) $product->title,
            (int) $result['amount'],
            $this->bot->cardToCardInstructions(),
            10,
        );
        $flow->handleUserMessage(
            $this->bot,
            $this->buyer,
            (int) $this->buyer->telegram_user_id,
            [
                'message_id' => 13,
                'photo' => [['file_id' => 'PHOTO4', 'width' => 100, 'height' => 100]],
            ],
        );

        $this->assertDatabaseHas('orders', ['id' => $orderId, 'status' => 'cancelled']);
    }
}
