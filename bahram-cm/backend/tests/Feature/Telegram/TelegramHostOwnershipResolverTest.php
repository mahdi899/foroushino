<?php

namespace Tests\Feature\Telegram;

use App\Models\Product;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\Seminar;
use App\Models\SeminarAttendee;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostOwnershipResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TelegramHostOwnershipResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_reference_channel_entitlement_counts_as_owned_without_course_access(): void
    {
        $user = User::factory()->create(['mobile' => '09129998877']);
        $channel = $this->makeChannel(1_000_000);

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
        ]);

        $owned = app(TelegramHostOwnershipResolver::class)->ownedProductIdsForUser($user);

        $this->assertContains((int) $channel->product_id, $owned);
    }

    public function test_seminar_attendee_counts_as_owned_without_course_access(): void
    {
        $user = User::factory()->create(['mobile' => '09128887766']);
        $seminar = $this->makeSeminar('سمینار تست', 500_000);

        SeminarAttendee::create([
            'seminar_id' => $seminar->id,
            'user_id' => $user->id,
            'attendance_status' => 'registered',
        ]);

        $owned = app(TelegramHostOwnershipResolver::class)->ownedProductIdsForUser($user);

        $this->assertContains((int) $seminar->product_id, $owned);
    }

    public function test_registration_snapshot_includes_reference_channel_product(): void
    {
        $user = User::factory()->create(['mobile' => '09127776655']);
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Test',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $channel = $this->makeChannel(1_000_000);

        ReferenceChannelEntitlement::create([
            'reference_channel_id' => $channel->id,
            'user_id' => $user->id,
        ]);

        $account = TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 900001,
            'user_id' => $user->id,
            'mobile' => $user->mobile,
            'mobile_verified_at' => now(),
            'first_name' => 'Test',
        ]);

        $snapshot = app(TelegramHostAccountSnapshotService::class)
            ->buildRegistrationSnapshot($account->fresh(['user', 'bot']));

        $this->assertContains((int) $channel->product_id, $snapshot['owned_product_ids'] ?? []);
        $this->assertArrayNotHasKey('profile', $snapshot);
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
            'show_in_panel' => true,
            'show_in_telegram' => true,
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
