<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyMediaStatus;
use App\Enums\Family\FamilyMediaType;
use App\Models\Family;
use App\Models\FamilyMedia;
use App\Models\FamilyMembership;
use App\Models\FamilyStory;
use App\Models\User;
use App\Services\Family\FamilyStoryService;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyStoryViewTest extends TestCase
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

    public function test_member_can_record_story_view_and_manager_can_list_viewers(): void
    {
        $publisher = $this->manager();
        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image->value,
            'status' => FamilyMediaStatus::Ready->value,
            'disk' => 'public',
            'storage_path' => 'family/stories/view-test.webp',
            'width' => 1080,
            'height' => 1920,
            'uploaded_by' => $publisher->id,
        ]);

        $family = Family::query()->create(['internal_name' => 'A', 'join_code' => 'AAAAA', 'member_count' => 1]);
        $member = User::factory()->create(['name' => 'Viewer', 'mobile' => '09120000001']);
        FamilyMembership::query()->create(['user_id' => $member->id, 'family_id' => $family->id, 'joined_at' => now()]);

        $story = app(FamilyStoryService::class)->publish($publisher, $media, null, 'all', []);

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/v1/family/stories/{$story->id}/view")
            ->assertOk()
            ->assertJsonPath('data.recorded', true);

        $this->assertDatabaseHas('family_story_views', [
            'story_id' => $story->id,
            'user_id' => $member->id,
        ]);

        $this->actingAs($publisher, 'sanctum')
            ->getJson("/api/v1/family-manager/stories/{$story->id}/viewers")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.mobile', '09120000001');
    }

    public function test_expired_story_cannot_record_view(): void
    {
        $member = User::factory()->create();
        FamilyMembership::query()->create([
            'user_id' => $member->id,
            'family_id' => Family::query()->create(['internal_name' => 'A', 'join_code' => 'AAAAA', 'member_count' => 1])->id,
            'joined_at' => now(),
        ]);

        $story = FamilyStory::query()->create([
            'media_id' => FamilyMedia::query()->create([
                'type' => FamilyMediaType::Image->value,
                'status' => FamilyMediaStatus::Ready->value,
                'disk' => 'public',
                'storage_path' => 'family/stories/expired.webp',
                'width' => 1080,
                'height' => 1920,
                'uploaded_by' => $member->id,
            ])->id,
            'audience_mode' => 'all',
            'published_by' => $member->id,
            'published_at' => now()->subDays(2),
            'expires_at' => now()->subDay(),
        ]);

        $this->actingAs($member, 'sanctum')
            ->postJson("/api/v1/family/stories/{$story->id}/view")
            ->assertNotFound();

        $this->assertDatabaseCount('family_story_views', 0);
    }

    public function test_non_member_cannot_record_story_view(): void
    {
        $publisher = $this->manager();
        $media = FamilyMedia::query()->create([
            'type' => FamilyMediaType::Image->value,
            'status' => FamilyMediaStatus::Ready->value,
            'disk' => 'public',
            'storage_path' => 'family/stories/member-only.webp',
            'width' => 1080,
            'height' => 1920,
            'uploaded_by' => $publisher->id,
        ]);

        $story = app(FamilyStoryService::class)->publish($publisher, $media, null, 'all', []);
        $outsider = User::factory()->create();

        $this->actingAs($outsider, 'sanctum')
            ->postJson("/api/v1/family/stories/{$story->id}/view")
            ->assertForbidden();

        $this->assertDatabaseCount('family_story_views', 0);
    }
}
