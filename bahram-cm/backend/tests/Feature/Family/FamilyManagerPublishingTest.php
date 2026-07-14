<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyMediaStatus;
use App\Models\FamilyMedia;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyManagerPublishingTest extends TestCase
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

    public function test_manager_can_create_and_publish_text_post(): void
    {
        $manager = $this->manager();

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'سلام خانواده! امروز روز مهمیه.'],
            ],
        ]);

        $store->assertCreated();
        $postId = $store->json('data.id');

        $this->assertDatabaseHas('family_posts', ['id' => $postId, 'status' => 'draft']);

        $publish = $this->actingAs($manager, 'sanctum')->postJson("/api/v1/family-manager/posts/{$postId}/publish");
        $publish->assertOk()->assertJsonPath('data.status', 'published');

        $this->assertDatabaseHas('family_posts', ['id' => $postId, 'status' => 'published']);
    }

    public function test_publish_fails_when_media_is_not_ready(): void
    {
        $manager = $this->manager();

        $media = FamilyMedia::create([
            'type' => 'voice',
            'disk' => 'family_media_ftp',
            'status' => FamilyMediaStatus::Processing,
            'uploaded_by' => $manager->id,
        ]);

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'voice',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'audio', 'position' => 0, 'media_id' => $media->id],
            ],
        ]);
        $postId = $store->json('data.id');

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish")
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'media_not_ready');

        $this->assertDatabaseHas('family_posts', ['id' => $postId, 'status' => 'draft']);
    }

    public function test_manager_without_permission_cannot_publish(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        // No role/permission assigned — should be rejected by family.manage middleware.

        $this->actingAs($admin, 'sanctum')
            ->postJson('/api/v1/family-manager/posts', ['type' => 'text', 'blocks' => []])
            ->assertForbidden();
    }
}
