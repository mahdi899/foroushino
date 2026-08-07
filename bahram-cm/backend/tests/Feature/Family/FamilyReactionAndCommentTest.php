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
            ->assertJsonPath('data.body', 'پاسخ بهرام به شما')
            ->assertJsonPath('data.is_bahram_reply', true)
            ->assertJsonPath('data.parent_id', $comment['id']);

        $this->assertDatabaseHas('family_comments', [
            'body' => 'پاسخ بهرام به شما',
            'parent_id' => $comment['id'],
            'post_id' => $post->id,
            'status' => FamilyCommentStatus::Approved->value,
        ]);

        $this->assertDatabaseMissing('family_posts', [
            'type' => 'reply',
            'reply_to_comment_id' => $comment['id'],
        ]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$post->id}/comments")
            ->assertOk()
            ->assertJsonPath('data.0.replies.0.body', 'پاسخ بهرام به شما');
    }

    public function test_member_can_reply_to_another_comment(): void
    {
        Queue::fake();

        $author = $this->joinedUser();
        $replier = User::factory()->create();
        $this->actingAs($replier, 'sanctum')->postJson('/api/v1/family/join')->assertOk();
        $post = $this->publishedPost();

        $comment = $this->actingAs($author, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'نظر اصلی'])
            ->assertCreated()
            ->json('data');

        $reply = $this->actingAs($replier, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", [
                'body' => 'پاسخ عضو',
                'parent_id' => $comment['id'],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame($comment['id'], $reply['parent_id']);
        $this->assertFalse($reply['is_bahram_reply']);

        // Reply-to-reply still nests under the root comment.
        $nested = $this->actingAs($author, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", [
                'body' => 'پاسخ به پاسخ',
                'parent_id' => $reply['id'],
            ])
            ->assertCreated()
            ->json('data');

        $this->assertSame($comment['id'], $nested['parent_id']);

        $this->actingAs($author, 'sanctum')
            ->getJson("/api/v1/family/posts/{$post->id}/comments")
            ->assertOk()
            ->assertJsonPath('data.0.replies.0.body', 'پاسخ عضو')
            ->assertJsonPath('data.0.replies.1.body', 'پاسخ به پاسخ');
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

    public function test_member_cannot_post_phone_number_in_comment(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'تماس بگیرید 09123456789'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_error')
            ->assertJsonPath('error.details.body.0', 'لطفاً شماره تلفن در نظر قرار ندهید. فقط ادمین می‌تواند شماره منتشر کند.');
    }

    public function test_admin_can_post_phone_number_in_comment(): void
    {
        Queue::fake();

        $admin = $this->managerAdmin();
        $this->actingAs($admin, 'sanctum')->postJson('/api/v1/family/join')->assertOk();
        $post = $this->publishedPost();

        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'پشتیبانی: 09123456789'])
            ->assertCreated()
            ->assertJsonPath('data.status', FamilyCommentStatus::Approved->value);
    }
}
