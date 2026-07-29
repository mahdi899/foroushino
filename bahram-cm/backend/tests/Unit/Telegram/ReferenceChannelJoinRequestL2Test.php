<?php

namespace Tests\Unit\Telegram;

use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Modules\TelegramBot\Clients\FakeTelegramBotClient;
use App\Modules\TelegramBot\Handlers\ChatJoinRequestHandler;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class ReferenceChannelJoinRequestL2Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Queue::fake();
    }

    public function test_join_request_without_l2_is_declined_with_identity_button(): void
    {
        $fake = new FakeTelegramBotClient;
        $this->app->instance(FakeTelegramBotClient::class, $fake);

        [$bot, $account, $destination] = $this->seedLinkedReferenceDestination();

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => ReferenceChannel::query()->where('telegram_destination_id', $destination->id)->value('id'),
            'user_id' => (int) $account->user_id,
            'source' => 'admin',
        ]);

        $update = TelegramUpdate::query()->create([
            'telegram_bot_id' => $bot->id,
            'update_id' => random_int(10000, 99999),
            'update_type' => 'chat_join_request',
            'payload' => [
                'update_id' => 1,
                'chat_join_request' => [
                    'chat' => ['id' => (int) $destination->chat_id],
                    'from' => ['id' => (int) $account->telegram_user_id],
                    'user_chat_id' => (int) $account->telegram_user_id,
                    'date' => time(),
                ],
            ],
        ]);

        app(ChatJoinRequestHandler::class)->handle($update, $bot);

        $this->assertTrue($fake->wasCalled('declineChatJoinRequest'));
        $this->assertTrue($fake->wasCalled('sendMessage'));

        $messageCall = collect($fake->calls)->firstWhere('method', 'sendMessage');
        $this->assertNotNull($messageCall);
        $this->assertStringContainsString(
            DestinationAccessPolicy::REASON_REFERENCE_IDENTITY_REQUIRED,
            (string) ($messageCall['arguments']['text'] ?? ''),
        );
        $markup = $messageCall['arguments']['options']['reply_markup']['inline_keyboard'] ?? null;
        $this->assertIsArray($markup);
        $this->assertNotEmpty($markup);
        $buttonText = (string) ($markup[0][0]['text'] ?? '');
        $this->assertStringContainsString('احراز هویت', $buttonText);
    }

    /**
     * @return array{0: TelegramBot, 1: TelegramAccount, 2: TelegramDestination}
     */
    private function seedLinkedReferenceDestination(): array
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
            'slug' => 'reference-join-l2-'.uniqid(),
            'type' => Product::TYPE_REFERENCE_CHANNEL,
            'price' => 1000,
            'is_active' => true,
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه مرجع',
            'chat_id' => '-100'.random_int(10000, 99999),
            'is_active' => true,
        ]);

        ReferenceChannel::create([
            'title' => 'کانال مرجع',
            'slug' => 'join-l2-'.uniqid(),
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

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => random_int(100000, 999999),
            'user_id' => $user->id,
            'mobile' => '09121112233',
            'mobile_verified_at' => now(),
        ]);

        return [$bot, $account, $destination];
    }
}
