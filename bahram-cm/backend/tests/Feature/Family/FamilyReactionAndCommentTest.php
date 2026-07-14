<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyPost;
use App\Models\User;
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
            'published_at' => now(),
        ]);
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

    public function test_non_admin_manager_route_is_forbidden(): void
    {
        $user = $this->joinedUser();

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family-manager/comments')
            ->assertForbidden();
    }
}
