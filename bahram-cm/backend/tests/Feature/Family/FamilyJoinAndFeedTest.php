<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyPostStatus;
use App\Models\Family;
use App\Models\FamilyPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyJoinAndFeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_preview_feed_without_joining(): void
    {
        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/family/feed');

        $response->assertOk()
            ->assertJsonPath('meta.guest', true)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $post->id);
    }

    public function test_logged_in_non_member_sees_preview_feed(): void
    {
        $user = User::factory()->create();
        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed')
            ->assertOk()
            ->assertJsonPath('meta.guest', true)
            ->assertJsonPath('meta.needs_join', true)
            ->assertJsonPath('data.0.id', $post->id);
    }

    public function test_student_can_join_family_and_see_member_feed(): void
    {
        $user = User::factory()->create();

        $joinResponse = $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/family/join', ['source' => 'instagram']);

        $joinResponse->assertOk()->assertJsonPath('data.joined', true);

        $this->assertDatabaseHas('family_memberships', ['user_id' => $user->id]);

        $family = Family::query()->first();
        $this->assertNotNull($family);
        $this->assertSame(1, $family->member_count);

        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $feed = $this->actingAs($user, 'sanctum')->getJson('/api/v1/family/feed');

        $feed->assertOk()
            ->assertJsonPath('meta.guest', false)
            ->assertJsonPath('data.0.id', $post->id);
    }

    public function test_joining_twice_is_idempotent(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        $this->assertDatabaseCount('family_memberships', 1);
    }

    public function test_onboarding_completion_is_tracked(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        $me = $this->actingAs($user, 'sanctum')->getJson('/api/v1/family/me');
        $me->assertOk()->assertJsonPath('data.onboarding_completed', false);

        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/onboarding/complete')->assertOk();

        $me2 = $this->actingAs($user, 'sanctum')->getJson('/api/v1/family/me');
        $me2->assertJsonPath('data.onboarding_completed', true);
    }

    public function test_placeholder_student_is_prompted_for_display_name_in_family(): void
    {
        $user = User::factory()->create(['name' => 'دانشجو']);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/me')
            ->assertOk()
            ->assertJsonPath('data.needs_name', true);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/v1/family/profile/name', [
                'first_name' => 'علی',
                'last_name' => 'احمدی',
            ])
            ->assertOk()
            ->assertJsonPath('data.needs_name', false)
            ->assertJsonPath('data.display_name', 'علی احمدی');

        $user->refresh()->load('profile');
        $this->assertSame('علی احمدی', $user->name);
        $this->assertSame('علی', $user->profile?->first_name);
        $this->assertSame('احمدی', $user->profile?->last_name);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/me')
            ->assertJsonPath('data.needs_name', false);
    }

    public function test_student_with_real_name_is_not_prompted_in_family(): void
    {
        $user = User::factory()->create(['name' => 'سارا رضایی']);
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/me')
            ->assertJsonPath('data.needs_name', false);
    }

    public function test_inactive_family_hides_feed_posts(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        $family = Family::query()->first();
        $this->assertNotNull($family);

        FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $family->update(['lifecycle' => 'inactive']);

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.family_inactive', true)
            ->assertJsonPath('meta.inactive_message', 'خانواده غیرفعال شده است');
    }
}
