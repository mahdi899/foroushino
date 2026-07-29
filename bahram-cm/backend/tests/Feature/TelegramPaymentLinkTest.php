<?php

namespace Tests\Feature;

use App\Enums\DiscountRestriction;
use App\Enums\DiscountType;
use App\Models\DiscountCode;
use App\Models\Order;
use App\Models\PaymentSetting;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramPaymentLink;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Services\SettingService;
use App\Services\TelegramInfrastructureService;
use App\Services\TelegramPaymentLinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class TelegramPaymentLinkTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_checkout_issues_site_token_url_without_calling_zarinpal(): void
    {
        Http::fake();
        [$account, $product] = $this->seedCheckoutAccount();

        $result = app(TelegramCheckoutService::class)->startZarinpalCheckout($account, $product);

        $this->assertArrayHasKey('payment_url', $result);
        $this->assertStringContainsString('/pay/telegram/', $result['payment_url']);
        $this->assertSame('کمپین نویسی تست', $result['product_title']);
        $this->assertDatabaseCount('payments', 0);
        $this->assertDatabaseCount('telegram_payment_links', 1);
        Http::assertNothingSent();
    }

    public function test_resolve_creates_zarinpal_payment_and_returns_gateway_url(): void
    {
        $this->activateSandbox();
        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A00000000000000000000000000000000099'],
                'errors' => [],
            ], 200),
        ]);

        [$account, $product] = $this->seedCheckoutAccount();
        app(TelegramCheckoutService::class)->startZarinpalCheckout($account, $product);
        $token = TelegramPaymentLink::query()->value('token');

        $response = $this->getJson('/api/payments/telegram/'.$token);

        $response->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('ok', true);
        $this->assertStringContainsString(
            'sandbox.zarinpal.com/pg/StartPay/A00000000000000000000000000000000099',
            (string) $response->json('payment_url'),
        );
        $this->assertNotNull(TelegramPaymentLink::query()->where('token', $token)->value('consumed_at'));
        unset($product, $account);
    }

    public function test_second_checkout_revokes_first_link(): void
    {
        [$account, $product] = $this->seedCheckoutAccount();
        $checkout = app(TelegramCheckoutService::class);

        $first = $checkout->startZarinpalCheckout($account, $product);
        $firstToken = TelegramPaymentLink::query()->orderBy('id')->value('token');

        $secondProduct = Product::create([
            'title' => 'سمینار تست',
            'slug' => 'seminar-pay-link-'.uniqid(),
            'type' => 'normal',
            'price' => 500_000,
            'is_active' => true,
        ]);
        $second = $checkout->startZarinpalCheckout($account, $secondProduct);

        $firstLink = TelegramPaymentLink::query()->where('token', $firstToken)->first();
        $this->assertNotNull($firstLink?->revoked_at);
        $this->assertSame('cancelled', Order::query()->find($first['order_id'])?->status);

        $this->getJson('/api/payments/telegram/'.$firstToken)
            ->assertStatus(410)
            ->assertJsonPath('status', 'expired');

        $this->assertStringContainsString('/pay/telegram/', $second['payment_url']);
    }

    public function test_expired_token_returns_410(): void
    {
        Carbon::setTestNow('2026-07-29 12:00:00');
        [$account, $product] = $this->seedCheckoutAccount();
        app(TelegramCheckoutService::class)->startZarinpalCheckout($account, $product);
        $token = TelegramPaymentLink::query()->value('token');

        TelegramPaymentLink::query()->where('token', $token)->update([
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/payments/telegram/'.$token)
            ->assertStatus(410)
            ->assertJsonPath('status', 'expired');
        unset($product);
    }

    public function test_reprice_drops_invalid_coupon_before_gateway(): void
    {
        $this->activateSandbox();
        Http::fake([
            'sandbox.zarinpal.com/pg/v4/payment/request.json' => Http::response([
                'data' => ['code' => 100, 'authority' => 'A00000000000000000000000000000000111'],
                'errors' => [],
            ], 200),
        ]);

        [$account, $product] = $this->seedCheckoutAccount(price: 1_000_000);
        DiscountCode::create([
            'code' => 'SAVE50',
            'title' => '۵۰٪',
            'discount_type' => DiscountType::Percent,
            'discount_value' => 50,
            'is_active' => true,
            'restriction' => DiscountRestriction::All,
        ]);

        $result = app(TelegramCheckoutService::class)->startZarinpalCheckout($account, $product, 'SAVE50');
        $this->assertSame(500_000, $result['amount']);

        DiscountCode::query()->where('code', 'SAVE50')->update(['is_active' => false]);

        $token = TelegramPaymentLink::query()->value('token');
        $resolved = app(TelegramPaymentLinkService::class)->resolve((string) $token);

        $this->assertSame('ok', $resolved['status']);
        $order = Order::query()->find($result['order_id']);
        $this->assertSame(1_000_000, (int) $order?->final_amount);
        $this->assertNull($order?->coupon_code);
    }

    public function test_revoke_open_endpoint_revokes_links(): void
    {
        config([
            'security.proxy_origin.allowed_values' => [
                'Cloudflare-Worker',
                'Internal-Sync',
                'Telegram-Host-App',
                'Main-Server',
            ],
        ]);

        $syncSecret = '01234567890123456789012345678901';
        app(SettingService::class)->updateGroup(TelegramInfrastructureService::GROUP, [
            TelegramInfrastructureService::KEY => [
                'bridge_type' => 'host',
                'base_url' => 'https://host.example.com/telegram',
                'host_sync_secret' => $syncSecret,
            ],
        ]);
        TelegramInfrastructureService::forgetCachedConfig();

        [$account, $product] = $this->seedCheckoutAccount();
        app(TelegramCheckoutService::class)->startZarinpalCheckout($account, $product);

        $this->withHeaders([
            'X-Proxy-Origin' => 'Telegram-Host-App',
            'Authorization' => 'Bearer '.$syncSecret,
        ])->postJson('/api/v1/integrations/telegram-host/live/checkout/revoke-open', [
            'telegram_user_id' => $account->telegram_user_id,
        ])
            ->assertOk()
            ->assertJsonPath('ok', true);

        $this->assertNotNull(TelegramPaymentLink::query()->value('revoked_at'));
        unset($product);
    }

    /**
     * @return array{0: TelegramAccount, 1: Product}
     */
    private function seedCheckoutAccount(int $price = 800_000): array
    {
        $user = User::factory()->create([
            'mobile' => '09123334455',
            'name' => 'خریدار تست',
            'status' => 'active',
        ]);

        $bot = TelegramBot::query()->firstOrCreate(
            ['key' => 'production'],
            [
                'display_name' => 'Bot',
                'username' => 'rostami_bot',
                'token_key' => 'TELEGRAM_BOT_TOKEN',
                'webhook_secret' => 'secret',
                'environment' => 'production',
                'is_active' => true,
                'settings' => ['features' => ['zarinpal_payment' => true]],
            ],
        );
        $bot->forceFill([
            'settings' => array_replace_recursive((array) $bot->settings, [
                'features' => ['zarinpal_payment' => true],
            ]),
        ])->save();

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => random_int(100000, 999999),
            'user_id' => $user->id,
            'mobile' => '09123334455',
            'mobile_verified_at' => now(),
            'display_name' => 'خریدار تست',
        ]);
        $account->setRelation('user', $user);
        $account->setRelation('bot', $bot->fresh());

        $product = Product::create([
            'title' => 'کمپین نویسی تست',
            'slug' => 'campaign-pay-link-'.uniqid(),
            'type' => 'package',
            'price' => $price,
            'is_active' => true,
        ]);

        return [$account, $product];
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
}
