<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyLifecycle;
use App\Enums\Family\FamilyMediaStatus;
use App\Models\Family;
use App\Models\FamilyMedia;
use App\Models\FamilyPost;
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

    public function test_manager_post_payload_includes_zero_view_stats_without_stat_rows(): void
    {
        $manager = $this->manager();

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'آمار بازدید خالی'],
            ],
        ]);

        $store->assertCreated();
        $postId = $store->json('data.id');

        $this->actingAs($manager, 'sanctum')
            ->getJson("/api/v1/family-manager/posts/{$postId}")
            ->assertOk()
            ->assertJsonPath('data.stats.views', 0);
    }

    public function test_manager_post_payload_sums_loaded_view_stats(): void
    {
        $manager = $this->manager();

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'آمار بازدید'],
            ],
        ]);

        $store->assertCreated();
        $postId = $store->json('data.id');

        $familyA = Family::query()->create([
            'internal_name' => 'family-a',
            'lifecycle' => FamilyLifecycle::Active,
            'member_count' => 1,
            'capacity_target' => 10,
            'capacity_min' => 1,
            'capacity_max' => 20,
        ]);
        $familyB = Family::query()->create([
            'internal_name' => 'family-b',
            'lifecycle' => FamilyLifecycle::Active,
            'member_count' => 1,
            'capacity_target' => 10,
            'capacity_min' => 1,
            'capacity_max' => 20,
        ]);

        $post = FamilyPost::query()->findOrFail($postId);
        $post->stats()->create(['family_id' => $familyA->id, 'views_count' => 3]);
        $post->stats()->create(['family_id' => $familyB->id, 'views_count' => 5]);

        $this->actingAs($manager, 'sanctum')
            ->getJson("/api/v1/family-manager/posts/{$postId}")
            ->assertOk()
            ->assertJsonPath('data.stats.views', 8);
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

    public function test_manager_can_update_delete_and_republish_published_post(): void
    {
        $manager = $this->manager();

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'نسخه اول'],
            ],
        ]);
        $postId = $store->json('data.id');

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish")
            ->assertOk();

        $this->actingAs($manager, 'sanctum')
            ->patchJson("/api/v1/family-manager/posts/{$postId}", [
                'blocks' => [
                    ['type' => 'text', 'position' => 0, 'text' => 'نسخه ویرایش‌شده'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.blocks.0.text_content', 'نسخه ویرایش‌شده');

        $firstPublishedAt = FamilyPost::query()->findOrFail($postId)->published_at;

        $republish = $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish");
        $republish->assertOk()
            ->assertJsonPath('data.status', 'published');

        $republishedAt = FamilyPost::query()->findOrFail($postId)->fresh()->published_at;
        $this->assertNotSame(
            $firstPublishedAt?->toDateTimeString(),
            $republishedAt?->toDateTimeString(),
            'Republish should move published_at forward',
        );

        $this->actingAs($manager, 'sanctum')
            ->deleteJson("/api/v1/family-manager/posts/{$postId}")
            ->assertOk();

        $this->assertDatabaseMissing('family_posts', ['id' => $postId]);
    }

    public function test_manager_can_recover_archived_post_to_published(): void
    {
        $manager = $this->manager();

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'برای آرشیو و بازیابی'],
            ],
        ]);
        $postId = $store->json('data.id');

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish")
            ->assertOk();

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/archive")
            ->assertOk()
            ->assertJsonPath('data.status', 'archived');

        $this->assertDatabaseHas('family_posts', [
            'id' => $postId,
            'status' => 'archived',
        ]);
        $this->assertNotNull(FamilyPost::query()->findOrFail($postId)->archived_at);

        $recover = $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/recover");
        $recover->assertOk()->assertJsonPath('data.status', 'published');

        $fresh = FamilyPost::query()->findOrFail($postId);
        $this->assertSame('published', $fresh->status->value);
        $this->assertNull($fresh->archived_at);
        $this->assertNotNull($fresh->published_at);
    }

    public function test_manager_can_update_and_republish_archived_post(): void
    {
        $manager = $this->manager();

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'نسخه آرشیو'],
            ],
        ]);
        $postId = $store->json('data.id');

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish")
            ->assertOk();

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/archive")
            ->assertOk();

        $this->actingAs($manager, 'sanctum')
            ->patchJson("/api/v1/family-manager/posts/{$postId}", [
                'blocks' => [
                    ['type' => 'text', 'position' => 0, 'text' => 'ویرایش در آرشیو'],
                ],
            ])
            ->assertOk()
            ->assertJsonPath('data.status', 'archived')
            ->assertJsonPath('data.blocks.0.text_content', 'ویرایش در آرشیو');

        $firstPublishedAt = FamilyPost::query()->findOrFail($postId)->published_at;

        $republish = $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish");
        $republish->assertOk()
            ->assertJsonPath('data.status', 'published');

        $fresh = FamilyPost::query()->findOrFail($postId);
        $this->assertNull($fresh->archived_at);
        $this->assertNotSame(
            $firstPublishedAt?->toDateTimeString(),
            $fresh->published_at?->toDateTimeString(),
            'Republish from archive should move published_at forward',
        );
        $this->assertSame('ویرایش در آرشیو', $fresh->blocks()->first()?->text_content);
    }

    public function test_manager_can_filter_posts_by_family_channel(): void
    {
        $manager = $this->manager();

        $familyA = \App\Models\Family::query()->create([
            'internal_name' => 'کانال آلفا',
            'member_count' => 0,
            'capacity_target' => 100,
            'capacity_min' => 50,
            'capacity_max' => 150,
            'accepting_members' => true,
        ]);
        $familyB = \App\Models\Family::query()->create([
            'internal_name' => 'کانال بتا',
            'member_count' => 0,
            'capacity_target' => 100,
            'capacity_min' => 50,
            'capacity_max' => 150,
            'accepting_members' => true,
        ]);

        $allPostId = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [['type' => 'text', 'position' => 0, 'text' => 'برای همه']],
        ])->json('data.id');
        $this->actingAs($manager, 'sanctum')->postJson("/api/v1/family-manager/posts/{$allPostId}/publish")->assertOk();

        $includePostId = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'include',
            'family_ids' => [$familyA->id],
            'blocks' => [['type' => 'text', 'position' => 0, 'text' => 'فقط آلفا']],
        ])->json('data.id');
        $this->actingAs($manager, 'sanctum')->postJson("/api/v1/family-manager/posts/{$includePostId}/publish")->assertOk();

        $excludePostId = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'exclude',
            'family_ids' => [$familyA->id],
            'blocks' => [['type' => 'text', 'position' => 0, 'text' => 'همه به‌جز آلفا']],
        ])->json('data.id');
        $this->actingAs($manager, 'sanctum')->postJson("/api/v1/family-manager/posts/{$excludePostId}/publish")->assertOk();

        $forA = $this->actingAs($manager, 'sanctum')
            ->getJson('/api/v1/family-manager/posts?status=published&family_id='.$familyA->id)
            ->assertOk()
            ->json('data');
        $forAIds = collect($forA)->pluck('id')->all();
        $this->assertContains($allPostId, $forAIds);
        $this->assertContains($includePostId, $forAIds);
        $this->assertNotContains($excludePostId, $forAIds);

        $forB = $this->actingAs($manager, 'sanctum')
            ->getJson('/api/v1/family-manager/posts?status=published&family_id='.$familyB->id)
            ->assertOk()
            ->json('data');
        $forBIds = collect($forB)->pluck('id')->all();
        $this->assertContains($allPostId, $forBIds);
        $this->assertNotContains($includePostId, $forBIds);
        $this->assertContains($excludePostId, $forBIds);

        $presented = collect($forA)->firstWhere('id', $includePostId);
        $this->assertSame('کانال آلفا', $presented['audience_summary']);
        $this->assertSame('کانال آلفا', $presented['targets'][0]['family_name']);
    }

    public function test_manager_can_view_action_results_with_responder_mobile(): void
    {
        $manager = $this->manager();

        $family = Family::query()->create([
            'internal_name' => 'نور',
            'member_count' => 0,
            'capacity_target' => 5000,
            'capacity_min' => 4500,
            'capacity_max' => 5200,
            'accepting_members' => true,
        ]);

        $member = User::factory()->create([
            'name' => 'رای‌دهنده',
            'mobile' => '09121112233',
            'is_admin' => false,
        ]);

        $store = $this->actingAs($manager, 'sanctum')->postJson('/api/v1/family-manager/posts', [
            'type' => 'text',
            'audience_mode' => 'all',
            'blocks' => [
                ['type' => 'text', 'position' => 0, 'text' => 'نظرسنجی تست'],
            ],
            'action' => [
                'type' => 'single_choice',
                'prompt' => 'گزینه مورد علاقه؟',
                'options' => [
                    ['label' => 'الف', 'value' => 'a'],
                    ['label' => 'ب', 'value' => 'b'],
                ],
            ],
        ]);
        $postId = $store->json('data.id');
        $actionId = $store->json('data.actions.0.id');

        $this->actingAs($manager, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$postId}/publish")
            ->assertOk();

        \App\Models\FamilyActionResponse::query()->create([
            'action_id' => $actionId,
            'user_id' => $member->id,
            'family_id' => $family->id,
            'value' => ['option' => 'a'],
        ]);

        $this->actingAs($manager, 'sanctum')
            ->getJson("/api/v1/family-manager/posts/{$postId}/action-results")
            ->assertOk()
            ->assertJsonPath('data.0.response_count', 1)
            ->assertJsonPath('data.0.responses.0.mobile', '09121112233')
            ->assertJsonPath('data.0.responses.0.value_label', 'الف')
            ->assertJsonPath('data.0.stats.total', 1);
    }
}
