<?php

namespace Tests\Unit\Telegram;

use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationRequirement;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
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

    public function test_entitlement_satisfies_product_requirement(): void
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
            'slug' => 'reference-access-test',
            'type' => Product::TYPE_REFERENCE_CHANNEL,
            'price' => 1000,
            'is_active' => true,
        ]);

        $channel = ReferenceChannel::create([
            'title' => 'کانال مرجع',
            'slug' => 'access-test',
            'status' => 'published',
            'price' => 1000,
            'product_id' => $product->id,
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه مرجع',
            'chat_id' => '-100999',
            'is_active' => true,
        ]);

        TelegramDestinationRequirement::query()->create([
            'telegram_destination_id' => $destination->id,
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
            'group_key' => 'default',
            'operator' => 'all',
        ]);

        $this->assertFalse(app(DestinationAccessPolicy::class)->evaluate($destination, $user->id)['allowed']);

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
            'source' => 'admin',
        ]);

        $this->assertTrue(app(DestinationAccessPolicy::class)->evaluate($destination, $user->id)['allowed']);
    }
}
