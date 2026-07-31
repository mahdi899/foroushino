<?php

namespace Tests\Feature\Family;

use App\Enums\Family\FamilyEntrySource;
use App\Enums\Family\FamilyLifecycle;
use App\Enums\Family\FamilyPostStatus;
use App\Models\Family;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\User;
use App\Services\Family\FamilyMetaCacheService;
use App\Services\Family\FeedService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class FamilyFeedCacheTest extends TestCase
{
    use RefreshDatabase;

    private function createFamily(string $name = 'family-a'): Family
    {
        return Family::query()->create([
            'internal_name' => $name,
            'lifecycle' => FamilyLifecycle::Active,
            'member_count' => 1,
            'capacity_target' => 10,
            'capacity_min' => 1,
            'capacity_max' => 20,
        ]);
    }

    public function test_unread_summary_fast_path_when_caught_up(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $family = $this->createFamily();
        FamilyMembership::query()->create([
            'user_id' => $user->id,
            'family_id' => $family->id,
            'entry_source' => FamilyEntrySource::Website->value,
            'joined_at' => now(),
        ]);

        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed/unread-summary?after_id='.$post->id);

        $response->assertOk()
            ->assertJsonPath('data.unread_count', 0)
            ->assertJsonPath('data.latest_post_id', $post->id)
            ->assertJsonPath('data.feed_revision', FeedService::feedRevision());
    }

    public function test_feed_version_bumps_on_invalidation(): void
    {
        Cache::flush();

        $before = FeedService::feedRevision();
        FeedService::invalidateFeedTipCache();

        $this->assertGreaterThan($before, FeedService::feedRevision());
    }

    public function test_publish_invalidates_feed_revision_globally(): void
    {
        Cache::flush();

        $familyA = $this->createFamily('family-a');
        $familyB = $this->createFamily('family-b');

        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'include',
            'published_at' => now(),
        ]);

        $post->targets()->create(['family_id' => $familyA->id]);

        $versionBefore = FeedService::feedRevision();

        FeedService::invalidateFeedTipCache();

        $this->assertGreaterThan($versionBefore, FeedService::feedRevision());
        $this->assertSame(
            FeedService::feedRevision(),
            FeedService::feedRevision(),
        );
        $this->assertNotNull($familyB->id);
    }

    public function test_meta_cache_returns_latest_post_id(): void
    {
        Cache::flush();

        $family = $this->createFamily();
        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $meta = app(FamilyMetaCacheService::class)->metaForFamily((int) $family->id);

        $this->assertSame($post->id, $meta['latest_post_id']);
        $this->assertArrayHasKey('feed_revision', $meta);
    }

    public function test_unread_summary_returns_304_with_matching_etag(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $family = $this->createFamily();
        FamilyMembership::query()->create([
            'user_id' => $user->id,
            'family_id' => $family->id,
            'entry_source' => FamilyEntrySource::Website->value,
            'joined_at' => now(),
        ]);

        $post = FamilyPost::create([
            'author_id' => User::factory()->create()->id,
            'type' => 'text',
            'status' => FamilyPostStatus::Published,
            'audience_mode' => 'all',
            'published_at' => now(),
        ]);

        $first = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed/unread-summary?after_id='.$post->id);

        $first->assertOk();
        $etag = (string) $first->headers->get('ETag');
        $this->assertNotSame('', $etag);

        $second = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed/unread-summary?after_id='.$post->id, [
                'If-None-Match' => $etag,
            ]);

        $second->assertStatus(304);
        $this->assertSame($etag, $second->headers->get('ETag'));
    }

    public function test_feed_cursor_page_is_cached_server_side(): void
    {
        Cache::flush();

        $user = User::factory()->create();
        $family = $this->createFamily();
        FamilyMembership::query()->create([
            'user_id' => $user->id,
            'family_id' => $family->id,
            'entry_source' => FamilyEntrySource::Website->value,
            'joined_at' => now(),
        ]);

        $authorId = User::factory()->create()->id;
        $posts = collect();
        for ($i = 0; $i < 5; $i++) {
            $posts->push(FamilyPost::create([
                'author_id' => $authorId,
                'type' => 'text',
                'status' => FamilyPostStatus::Published,
                'audience_mode' => 'all',
                'published_at' => now()->subMinutes($i),
            ]));
        }

        $tip = $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed?limit=2');

        $tip->assertOk();
        $cursor = $tip->json('meta.next_cursor');
        $this->assertNotNull($cursor);

        $version = FeedService::feedRevision();
        $cacheKey = "family:feed:cursor:{$family->id}:2:{$cursor}:v{$version}";
        $this->assertFalse(Cache::has($cacheKey));

        $this->actingAs($user, 'sanctum')
            ->getJson('/api/v1/family/feed?limit=2&cursor='.urlencode((string) $cursor))
            ->assertOk();

        $this->assertTrue(Cache::has($cacheKey));
    }
}
