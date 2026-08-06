<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyLifecycle;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\Family\FamilyReactionType;
use App\Models\Family;
use App\Models\FamilyDailyMetric;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyManagerAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function manager(): User
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);

        return $admin;
    }

    public function test_analytics_posts_and_reactions_are_live_not_stale_rollups(): void
    {
        $manager = $this->manager();
        $today = now()->toDateString();

        // Inflated historical rollup — must be ignored for posts/reactions.
        FamilyDailyMetric::query()->create([
            'family_id' => null,
            'date' => $today,
            'new_members' => 0,
            'posts_published' => 99,
            'reactions' => 99,
            'comments_approved' => 0,
            'comments_pending' => 0,
            'actions_completed' => 0,
            'voice_plays' => 0,
            'video_plays' => 0,
        ]);

        $family = Family::query()->create([
            'internal_name' => 'analytics-family',
            'lifecycle' => FamilyLifecycle::Active,
            'member_count' => 1,
            'capacity_target' => 10,
            'capacity_min' => 1,
            'capacity_max' => 20,
        ]);

        $kept = FamilyPost::query()->create([
            'author_id' => $manager->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now()->subHour(),
        ]);

        $archived = FamilyPost::query()->create([
            'author_id' => $manager->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Archived,
            'audience_mode' => 'all',
            'published_at' => now()->subHours(2),
            'archived_at' => now()->subMinutes(10),
        ]);

        $deleted = FamilyPost::query()->create([
            'author_id' => $manager->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now()->subHours(3),
        ]);

        $member = User::factory()->create();

        FamilyReaction::query()->create([
            'post_id' => $kept->id,
            'user_id' => $member->id,
            'family_id' => $family->id,
            'type' => FamilyReactionType::Heart,
        ]);

        // Reaction on archived post must not count.
        FamilyReaction::query()->create([
            'post_id' => $archived->id,
            'user_id' => $member->id,
            'family_id' => $family->id,
            'type' => FamilyReactionType::Fire,
        ]);

        $deleted->delete();

        $response = $this->actingAs($manager, 'sanctum')
            ->getJson('/api/v1/family-manager/analytics?days=30');

        $response->assertOk();

        $daily = collect($response->json('data.daily'));
        $postsPublished = $daily->sum('posts_published');
        $reactions = $daily->sum('reactions');

        $this->assertSame(1, $postsPublished);
        $this->assertSame(1, $reactions);
        $this->assertNotSame(99, $postsPublished);
        $this->assertNotSame(99, $reactions);
    }
}
