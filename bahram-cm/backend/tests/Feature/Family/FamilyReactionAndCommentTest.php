<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyPost;
use App\Models\User;
use App\Models\UserProfile;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FamilyReactionAndCommentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
    }

    private function joinedUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        return $user;
    }

    private function publishedPost(): FamilyPost
    {
        return FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'comments_enabled' => true,
            'published_at' => now(),
        ]);
    }

    private function managerAdmin(): User
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);

        return $admin;
    }

    public function test_member_can_react_and_toggle_reaction(): void
    {
        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/family/posts/{$post->id}/reaction", ['type' => 'fire'])
            ->assertOk()
            ->assertJsonPath('data.type', 'fire');

        $this->assertDatabaseHas('family_post_stats', ['post_id' => $post->id, 'fire_count' => 1]);

        // Switching reaction type decrements the old count and increments the new one.
        $this->actingAs($user, 'sanctum')
            ->putJson("/api/v1/family/posts/{$post->id}/reaction", ['type' => 'heart'])
            ->assertOk();

        $this->assertDatabaseHas('family_post_stats', ['post_id' => $post->id, 'fire_count' => 0, 'heart_count' => 1]);

        $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/v1/family/posts/{$post->id}/reaction")
            ->assertOk()
            ->assertJsonPath('data.removed', true);

        $this->assertDatabaseHas('family_post_stats', ['post_id' => $post->id, 'heart_count' => 0]);
    }

    public function test_guest_cannot_react(): void
    {
        $post = $this->publishedPost();

        $this->putJson("/api/v1/family/posts/{$post->id}/reaction", ['type' => 'fire'])
            ->assertUnauthorized();
    }

    public function test_comment_is_auto_approved_without_moderation(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'سلام داداش بهرام، عالی بود!']);

        $response->assertCreated()->assertJsonPath('data.status', FamilyCommentStatus::Approved->value);

        $this->assertDatabaseHas('family_comments', [
            'post_id' => $post->id,
            'user_id' => $user->id,
            'status' => FamilyCommentStatus::Approved->value,
        ]);

        $this->assertDatabaseHas('family_post_stats', ['post_id' => $post->id, 'approved_comments_count' => 1]);
    }

    public function test_manager_approve_is_idempotent_for_already_approved_comment(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'ممنون بابت انگیزه!'])
            ->json('data');

        $admin = User::factory()->create(['is_admin' => true]);
        $admin->assignRole(AdminRoleName::SuperAdmin->value);

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/comments/{$comment['id']}/approve")
            ->assertStatus(422);
    }

    public function test_manager_comment_threads_groups_by_post_and_family(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'اولین نظر'])
            ->assertCreated();

        $admin = $this->managerAdmin();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/family-manager/comments/threads?tab=approved')
            ->assertOk()
            ->assertJsonPath('data.0.post_id', $post->id)
            ->assertJsonPath('data.0.matching_count', 1)
            ->assertJsonStructure([
                'data' => [
                    [
                        'post_id',
                        'family_id',
                        'family_internal_name',
                        'matching_count',
                        'pending_count',
                    ],
                ],
            ]);
    }

    public function test_manager_can_filter_comments_by_post_and_family(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'نظر فیلتر'])
            ->assertCreated()
            ->json('data');

        $familyId = \App\Models\FamilyComment::query()->findOrFail($comment['id'])->family_id;
        $admin = $this->managerAdmin();

        $this->actingAs($admin, 'sanctum')
            ->getJson('/api/v1/family-manager/comments?tab=approved&post_id='.$post->id.'&family_id='.$familyId)
            ->assertOk()
            ->assertJsonPath('data.0.id', $comment['id']);
    }

    public function test_manager_mark_important_is_visible_on_family_comment_payload(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'نظر مهم'])
            ->assertCreated()
            ->json('data');

        $admin = $this->managerAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/comments/{$comment['id']}/mark-important")
            ->assertOk()
            ->assertJsonPath('data.is_important', true);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$post->id}/comments")
            ->assertOk()
            ->assertJsonPath('data.0.is_important', true);
    }

    public function test_manager_can_reply_to_comment_with_text(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'سؤالی داشتم'])
            ->assertCreated()
            ->json('data');

        $admin = $this->managerAdmin();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$comment['id']}/reply", [
                'type' => 'text',
                'text' => 'پاسخ بهرام به شما',
            ])
            ->assertCreated()
            ->assertJsonPath('data.type', 'reply')
            ->assertJsonPath('data.status', FamilyPostStatus::Published->value);

        $this->assertDatabaseHas('family_posts', [
            'type' => 'reply',
            'reply_to_comment_id' => $comment['id'],
            'status' => FamilyPostStatus::Published->value,
        ]);
    }

    public function test_comment_includes_resolved_student_avatar_url(): void
    {
        Queue::fake();

        config([
            'bahram.media_url' => 'https://cdn.example.com',
            'bahram.frontend_url' => 'https://rostami.app',
        ]);

        $user = $this->joinedUser();
        UserProfile::create([
            'user_id' => $user->id,
            'avatar' => '/storage/media/avatars/'.$user->id.'/face.jpg',
        ]);

        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'عالی بود!'])
            ->assertCreated()
            ->assertJsonPath(
                'data.user.avatar',
                'https://cdn.example.com/media/avatars/'.$user->id.'/face.jpg',
            )
            ->assertJsonPath('data.user.avatar_version', fn ($value) => is_int($value) && $value > 0);
    }

    public function test_non_admin_manager_route_is_forbidden(): void
    {
        $user = $this->joinedUser();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family-manager/comments')
            ->assertForbidden();
    }
}
