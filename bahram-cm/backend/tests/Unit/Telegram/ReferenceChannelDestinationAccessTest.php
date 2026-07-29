<?php

namespace Tests\Unit\Telegram;

use App\Actions\Identity\EnsureIdentityProfile;
use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
use App\Modules\TelegramBot\Services\TelegramReferenceChannelPresenter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReferenceChannelDestinationAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_entitlement_without_identity_level_2_is_denied(): void
    {
        [$user, $destination, $channel] = $this->seedReferenceDestination();

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'source' => 'admin',
        ]);

        $result = app(DestinationAccessPolicy::class)->evaluate($destination, $user->id);

        $this->assertFalse($result['allowed']);
        $this->assertSame(
            DestinationAccessPolicy::REASON_REFERENCE_IDENTITY_REQUIRED,
            $result['reason'],
        );
    }

    public function test_entitlement_with_identity_level_2_is_allowed(): void
    {
        [$user, $destination, $channel] = $this->seedReferenceDestination();

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'source' => 'admin',
        ]);

        $profile = app(EnsureIdentityProfile::class)($user);
        $profile->forceFill(['verification_level' => 2])->save();

        $result = app(DestinationAccessPolicy::class)->evaluate($destination, $user->id);

        $this->assertTrue($result['allowed']);
    }

    public function test_entitlement_satisfies_product_requirement(): void
    {
        [$user, $destination, $channel] = $this->seedReferenceDestination();

        $this->assertFalse(app(DestinationAccessPolicy::class)->evaluate($destination, $user->id)['allowed']);

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'source' => 'admin',
        ]);

        $profile = app(EnsureIdentityProfile::class)($user);
        $profile->forceFill(['verification_level' => 2])->save();

        $this->assertTrue(app(DestinationAccessPolicy::class)->evaluate($destination, $user->id)['allowed']);
    }

    public function test_present_owned_without_l2_has_no_invite_url(): void
    {
        [$user, $destination, $channel, $bot] = $this->seedReferenceDestination();

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'source' => 'admin',
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => random_int(100000, 999999),
            'user_id' => $user->id,
            'mobile' => '09121112233',
            'mobile_verified_at' => now(),
        ]);
        $account->setRelation('user', $user);
        $channel->load(['product', 'telegramDestination']);

        $view = app(TelegramReferenceChannelPresenter::class)->presentOwned($bot, $account, $channel);

        $this->assertStringContainsString('احراز هویت سطح ۲', $view['text']);
        $keyboard = $view['options']['reply_markup']['inline_keyboard'] ?? [];
        $flat = collect($keyboard)->flatten(1);
        $this->assertTrue(
            $flat->contains(fn ($btn) => str_contains((string) ($btn['text'] ?? ''), 'احراز هویت')),
        );
        $this->assertFalse(
            $flat->contains(fn ($btn) => str_contains((string) ($btn['text'] ?? ''), 'عضویت در گروه مرجع')),
        );
        unset($destination);
    }

    /**
     * @return array{0: User, 1: TelegramDestination, 2: ReferenceChannel, 3: TelegramBot}
     */
    private function seedReferenceDestination(): array
    {
        $user = User::factory()->create();
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $product = Product::create([
            'title' => 'کانال مرجع',
            'slug' => 'reference-access-test-'.uniqid(),
            'type' => Product::TYPE_REFERENCE_CHANNEL,
            'price' => 1000,
            'is_active' => true,
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه مرجع',
            'chat_id' => '-100'.random_int(1000, 9999),
            'is_active' => true,
        ]);

        $channel = ReferenceChannel::create([
            'title' => 'کانال مرجع',
            'slug' => 'access-test-'.uniqid(),
            'status' => 'published',
            'price' => 1000,
            'product_id' => $product->id,
            'telegram_destination_id' => $destination->id,
        ]);

        TelegramDestinationRequirement::query()->create([
            'telegram_destination_id' => $destination->id,
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
            'group_key' => 'default',
            'operator' => 'all',
        ]);

        return [$user, $destination, $channel, $bot];
    }
}
