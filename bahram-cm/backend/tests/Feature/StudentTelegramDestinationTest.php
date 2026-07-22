<?php

namespace Tests\Feature;

use App\Models\CourseAccess;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class StudentTelegramDestinationTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_receives_accessible_telegram_destinations(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'username' => 'rostami_bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        $product = Product::query()->create([
            'title' => 'دوره سات',
            'slug' => 'sat-course-panel',
            'price' => 1000000,
            'is_active' => true,
        ]);

        CourseAccess::query()->create([
            'user_id' => $user->id,
            'product_id' => $product->id,
            'status' => 'active',
        ]);

        TelegramAccount::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_user_id' => 123456789,
            'user_id' => $user->id,
            'mobile' => '09120000000',
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'پشتیبانی سات',
            'chat_id' => '-100123456',
            'access_mode' => 'join_request',
            'join_request_url' => 'https://t.me/+shared',
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'product',
            'requirement_value' => (string) $product->id,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/student/telegram-destinations')
            ->assertOk()
            ->assertJsonPath('data.telegram_linked', true)
            ->assertJsonPath('data.telegram_bot_url', 'https://t.me/rostami_bot')
            ->assertJsonCount(1, 'data.destinations')
            ->assertJsonPath('data.destinations.0.title', 'پشتیبانی سات')
            ->assertJsonPath('data.destinations.0.status', 'invite')
            ->assertJsonPath('data.destinations.0.invite_url', 'https://t.me/+shared')
            ->assertJsonPath('data.destinations.0.product_titles.0', 'دوره سات');
    }

    public function test_student_without_course_access_gets_empty_destinations(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/student/telegram-destinations')
            ->assertOk()
            ->assertJsonPath('data.telegram_linked', false)
            ->assertJsonCount(0, 'data.destinations');
    }

    public function test_student_with_active_sat_membership_receives_sat_group(): void
    {
        $user = User::factory()->create(['status' => 'active']);
        $bot = TelegramBot::query()->create([
            'key' => 'production',
            'display_name' => 'Bot',
            'token_key' => 'TELEGRAM_BOT_TOKEN',
            'webhook_secret' => 'secret',
            'environment' => 'production',
            'is_active' => true,
        ]);

        \App\Models\SatApplication::query()->create([
            'user_id' => $user->id,
            'name' => 'کاربر سات',
            'mobile' => '09120000002',
            'status' => \App\Enums\SatApplicationStatus::Accepted,
            'submitted_at' => now(),
        ]);

        $destination = TelegramDestination::query()->create([
            'telegram_bot_id' => $bot->id,
            'title' => 'گروه پشتیبانی سات',
            'chat_id' => '-100999',
            'access_mode' => 'join_request',
            'join_request_url' => 'https://t.me/+sat-group',
            'is_active' => true,
        ]);
        $destination->requirements()->create([
            'requirement_type' => 'sat_membership',
            'requirement_value' => 'active',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/student/telegram-destinations')
            ->assertOk()
            ->assertJsonCount(1, 'data.destinations')
            ->assertJsonPath('data.destinations.0.title', 'گروه پشتیبانی سات')
            ->assertJsonPath('data.destinations.0.invite_url', 'https://t.me/+sat-group')
            ->assertJsonPath('data.destinations.0.product_titles.0', 'عضویت فعال سات');
    }
}
