<?php

namespace Tests\Unit\Telegram;

use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccessDenial;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DestinationAccessPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_denial_blocks_access(): void
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

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'مرجع',
            'chat_id' => '-1001',
            'is_active' => true,
        ]);

        TelegramAccessDenial::query()->create([
            'telegram_destination_id' => $destination->id,
            'user_id' => $user->id,
            'reason' => 'manual',
        ]);

        $result = app(DestinationAccessPolicy::class)->evaluate($destination, $user->id);

        $this->assertFalse($result['allowed']);
    }

    public function test_unlinked_user_denied(): void
    {
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'مرجع',
            'chat_id' => '-1002',
            'is_active' => true,
        ]);

        $result = app(DestinationAccessPolicy::class)->evaluate($destination, null);
        $this->assertFalse($result['allowed']);
    }

    public function test_sat_membership_requirement_requires_active_membership(): void
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

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه سات',
            'chat_id' => '-1003',
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'sat_membership',
            'requirement_value' => 'active',
        ]);

        $denied = app(DestinationAccessPolicy::class)->evaluate($destination, $user->id);
        $this->assertFalse($denied['allowed']);

        \App\Models\SatMembership::query()->create([
            'user_id' => $user->id,
            'status' => \App\Enums\SatMembershipStatus::Active,
            'activated_at' => now(),
        ]);

        $allowed = app(DestinationAccessPolicy::class)->evaluate($destination, $user->id);
        $this->assertTrue($allowed['allowed']);
    }
}
