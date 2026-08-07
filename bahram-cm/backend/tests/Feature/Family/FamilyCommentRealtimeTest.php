<?php

namespace Tests\Feature\Family;

use App\Enums\AdminRoleName;
use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Events\FamilyCommentChanged;
use App\Events\FamilyFeedUpdated;
use App\Models\FamilyComment;
use App\Models\FamilyPost;
use App\Models\User;
use Database\Seeders\RolePermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class FamilyCommentRealtimeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolePermissionSeeder::class);
        config(['family.comment.require_approval' => false]);
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

    public function test_approved_member_comment_broadcasts_created_and_feed_count(): void
    {
        Queue::fake();
        Event::fake([FamilyCommentChanged::class, FamilyFeedUpdated::class]);

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'سلام داداش بهرام'])
            ->assertCreated();

        Event::assertDispatched(FamilyCommentChanged::class, function (FamilyCommentChanged $event) use ($post) {
            return $event->action === 'created'
                && (int) $event->comment->post_id === (int) $post->id
                && $event->approvedCommentsCount === 1;
        });

        Event::assertDispatched(FamilyFeedUpdated::class, function (FamilyFeedUpdated $event) use ($post) {
            return $event->event === 'comments_count'
                && (int) $event->post->id === (int) $post->id
                && $event->approvedCommentsCount === 1;
        });
    }

    public function test_pending_member_comment_does_not_broadcast_to_post_channel(): void
    {
        Queue::fake();
        Event::fake([FamilyCommentChanged::class, FamilyFeedUpdated::class]);
        config(['family.comment.require_approval' => true]);

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'در انتظار تأیید'])
            ->assertCreated()
            ->assertJsonPath('data.status', FamilyCommentStatus::Pending->value);

        Event::assertNotDispatched(FamilyCommentChanged::class);
        Event::assertNotDispatched(FamilyFeedUpdated::class, fn (FamilyFeedUpdated $e) => $e->event === 'comments_count');
    }

    public function test_manager_approve_broadcasts_approved(): void
    {
        Queue::fake();
        config(['family.comment.require_approval' => true]);

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'لطفاً تأیید کنید'])
            ->assertCreated()
            ->json('data');

        Event::fake([FamilyCommentChanged::class, FamilyFeedUpdated::class]);

        $admin = $this->managerAdmin();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/comments/{$comment['id']}/approve")
            ->assertOk();

        Event::assertDispatched(FamilyCommentChanged::class, function (FamilyCommentChanged $event) use ($comment) {
            return $event->action === 'approved'
                && (int) $event->comment->id === (int) $comment['id'];
        });

        Event::assertDispatched(FamilyFeedUpdated::class, fn (FamilyFeedUpdated $e) => $e->event === 'comments_count');
    }

    public function test_reject_pending_does_not_broadcast_removed(): void
    {
        Queue::fake();
        config(['family.comment.require_approval' => true]);

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'رد شود'])
            ->assertCreated()
            ->json('data');

        Event::fake([FamilyCommentChanged::class]);

        $admin = $this->managerAdmin();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/comments/{$comment['id']}/reject", [
                'reason' => FamilyCommentRejectionReason::Irrelevant->value,
            ])
            ->assertOk();

        Event::assertNotDispatched(FamilyCommentChanged::class);
    }

    public function test_reject_approved_broadcasts_removed(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'بعداً رد'])
            ->assertCreated()
            ->json('data');

        Event::fake([FamilyCommentChanged::class, FamilyFeedUpdated::class]);

        $admin = $this->managerAdmin();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/comments/{$comment['id']}/reject", [
                'reason' => FamilyCommentRejectionReason::Insult->value,
            ])
            ->assertOk();

        Event::assertDispatched(FamilyCommentChanged::class, function (FamilyCommentChanged $event) use ($comment) {
            return $event->action === 'removed'
                && (int) $event->comment->id === (int) $comment['id'];
        });
    }

    public function test_manager_reply_broadcasts_created_with_parent(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'سؤال'])
            ->assertCreated()
            ->json('data');

        Event::fake([FamilyCommentChanged::class, FamilyFeedUpdated::class]);

        $admin = $this->managerAdmin();
        $this->actingAs($admin, 'sanctum')
            ->postJson("/api/v1/family-manager/posts/{$comment['id']}/reply", [
                'type' => 'text',
                'text' => 'پاسخ بهرام',
            ])
            ->assertCreated();

        Event::assertDispatched(FamilyCommentChanged::class, function (FamilyCommentChanged $event) use ($comment) {
            return $event->action === 'created'
                && (int) $event->comment->parent_id === (int) $comment['id'];
        });
    }

    public function test_comments_index_includes_family_id_meta(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'متا'])
            ->assertCreated();

        $familyId = FamilyComment::query()->where('post_id', $post->id)->value('family_id');

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$post->id}/comments")
            ->assertOk()
            ->assertJsonPath('meta.family_id', $familyId);
    }

    public function test_member_can_authorize_comments_channel_for_own_family(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'کانال'])
            ->assertCreated()
            ->json('data');

        $familyId = (int) FamilyComment::query()->findOrFail($comment['id'])->family_id;

        $allowed = app(\App\Services\Family\FamilyCommentChannelAuthorizer::class)
            ->authorize($user, $familyId, (int) $post->id);

        $this->assertTrue($allowed);
    }

    public function test_outsider_cannot_authorize_comments_channel(): void
    {
        Queue::fake();

        $member = $this->joinedUser();
        $post = $this->publishedPost();

        $comment = $this->actingAs($member, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'خصوصی'])
            ->assertCreated()
            ->json('data');

        $familyId = (int) FamilyComment::query()->findOrFail($comment['id'])->family_id;
        $outsider = User::factory()->create();

        $allowed = app(\App\Services\Family\FamilyCommentChannelAuthorizer::class)
            ->authorize($outsider, $familyId, (int) $post->id);

        $this->assertFalse($allowed);
    }

    public function test_comment_changed_payload_omits_moderation_fields(): void
    {
        Queue::fake();

        $user = $this->joinedUser();
        $post = $this->publishedPost();

        $response = $this->actingAs($user, 'sanctum')
            ->postJson("/api/v1/family/posts/{$post->id}/comments", ['body' => 'بدون متای داخلی'])
            ->assertCreated();

        $comment = FamilyComment::query()->findOrFail($response->json('data.id'));
        $event = new FamilyCommentChanged($comment->load(['user.profile']), 'created', 1);
        $payload = $event->broadcastWith();

        $this->assertSame('created', $payload['action']);
        $this->assertArrayHasKey('comment', $payload);
        $this->assertArrayNotHasKey('ai_risk_score', $payload['comment']);
        $this->assertArrayNotHasKey('rejection_note', $payload['comment']);
        $this->assertArrayNotHasKey('moderated_by', $payload['comment']);
        $this->assertFalse($payload['comment']['is_pending_mine']);
    }
}
