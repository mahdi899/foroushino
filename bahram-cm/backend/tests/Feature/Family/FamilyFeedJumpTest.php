<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FamilyFeedJumpTest extends TestCase
{
    use RefreshDatabase;

    private function joinedUser(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/v1/family/join')->assertOk();

        return $user;
    }

    /** @return list<FamilyPost> */
    private function publishSequence(int $count): array
    {
        $posts = [];
        $base = now()->subDays($count);

        for ($i = 0; $i < $count; $i++) {
            $posts[] = FamilyPost::create([
                'author_id' => User::factory()->create()->id,
                'type' => 'text',
                'status' => FamilyPostStatus::Published,
                'audience_mode' => 'all',
                'published_at' => $base->copy()->addHours($i),
            ]);
        }

        return $posts;
    }

    public function test_jump_returns_window_centered_on_an_old_post_with_has_newer(): void
    {
        $user = $this->joinedUser();
        $posts = $this->publishSequence(30);
        $target = $posts[2]; // deep in history — far outside a normal 15/page load window

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$target->id}/jump");

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');

        $this->assertTrue($ids->contains($target->id), 'target post missing from jump window');
        $this->assertTrue($response->json('meta.has_newer'), 'expected more posts newer than target to exist');
        $this->assertSame($target->id, $response->json('meta.target_post_id'));
        $this->assertNotNull($response->json('meta.prev_cursor'), 'prev_cursor required for load-newer after jump');
        $this->assertIsBool($response->json('meta.has_older'));

        // Window must stay chronologically descending (newest → oldest), matching the feed.
        $publishedAts = collect($response->json('data'))->pluck('published_at')->map(fn ($v) => strtotime((string) $v));
        $this->assertSame($publishedAts->values()->all(), $publishedAts->sortDesc()->values()->all());
    }

    public function test_jump_to_oldest_post_has_no_newer_cursor_but_flags_has_newer(): void
    {
        $user = $this->joinedUser();
        $posts = $this->publishSequence(20);
        $oldest = $posts[0];

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$oldest->id}/jump")
            ->assertOk();

        $ids = collect($response->json('data'))->pluck('id');
        $this->assertSame((int) $oldest->id, (int) $ids->last(), 'oldest post should be the last item in the descending window');
        $this->assertTrue($response->json('meta.has_newer'));
    }

    public function test_jump_to_latest_post_has_no_newer_and_next_cursor_continues_pagination(): void
    {
        $user = $this->joinedUser();
        $posts = $this->publishSequence(20);
        $latest = $posts[array_key_last($posts)];

        $response = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$latest->id}/jump")
            ->assertOk();

        $this->assertFalse($response->json('meta.has_newer'));
        $this->assertNull($response->json('meta.prev_cursor'));
        $this->assertNotNull($response->json('meta.next_cursor'));

        $older = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed?cursor=' . urlencode($response->json('meta.next_cursor')))
            ->assertOk();

        $this->assertNotEmpty($older->json('data'));
    }

    public function test_feed_newer_direction_returns_posts_after_prev_cursor(): void
    {
        $user = $this->joinedUser();
        $posts = $this->publishSequence(20);
        $target = $posts[5];

        $jump = $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$target->id}/jump")
            ->assertOk();

        $prev = $jump->json('meta.prev_cursor');
        $this->assertNotNull($prev);

        $newer = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed?direction=newer&cursor=' . urlencode($prev))
            ->assertOk();

        $this->assertNotEmpty($newer->json('data'));
        $newestInJump = collect($jump->json('data'))->first()['id'];
        $newerIds = collect($newer->json('data'))->pluck('id');
        $this->assertFalse($newerIds->contains($newestInJump), 'newer page should not re-include the cursor tip');
    }

    public function test_jump_requires_authentication(): void
    {
        $posts = $this->publishSequence(5);

        $this->getJson("/api/v1/family/posts/{$posts[0]->id}/jump")->assertUnauthorized();
    }

    public function test_jump_404s_for_post_not_visible_to_the_members_family(): void
    {
        $user = $this->joinedUser();

        $hiddenPost = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'exclude',
            'published_at' => now(),
        ]);
        $hiddenPost->targets()->create(['family_id' => $user->familyMembership()->first()->family_id]);

        $this->actingAs($user, 'sanctum')
            ->getJson("/api/v1/family/posts/{$hiddenPost->id}/jump")
            ->assertNotFound();
    }

    public function test_feed_tip_cache_never_leaks_one_users_reaction_to_another_member(): void
    {
        $userA = $this->joinedUser();
        $userB = $this->joinedUser();
        $post = $this->publishSequence(1)[0];

        FamilyReaction::query()->create([
            'post_id' => $post->id,
            'family_id' => $userA->familyMembership()->first()->family_id,
            'user_id' => $userA->id,
            'type' => 'fire',
        ]);

        // Prime the shared tip cache via userA's request first.
        $this->actingAs($userA, 'sanctum')
            ->getJson('/api/v1/family/feed')
            ->assertOk()
            ->assertJsonPath('data.0.user_reaction', 'fire');

        // userB shares the same cached tip page but must never see userA's reaction.
        $this->actingAs($userB, 'sanctum')
            ->getJson('/api/v1/family/feed')
            ->assertOk()
            ->assertJsonPath('data.0.user_reaction', null);
    }
}
