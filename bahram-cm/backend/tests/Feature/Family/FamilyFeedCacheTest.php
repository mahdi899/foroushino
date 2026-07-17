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
            ->assertJsonPath('data.feed_revision', FeedService::feedRevision((int) $family->id));
    }

    public function test_feed_version_is_scoped_per_family(): void
    {
        Cache::flush();

        $familyA = $this->createFamily('family-a');
        $familyB = $this->createFamily('family-b');

        FeedService::invalidateFeedTipCache(null, [(int) $familyA->id]);

        $this->assertGreaterThan(
            FeedService::feedRevision((int) $familyB->id),
            FeedService::feedRevision((int) $familyA->id),
        );
    }

    public function test_publish_invalidates_only_target_families_for_include_mode(): void
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

        $versionBeforeB = FeedService::feedRevision((int) $familyB->id);

        FeedService::invalidateFeedTipCache($post->fresh(['targets']));

        $this->assertGreaterThan(0, FeedService::feedRevision((int) $familyA->id));
        $this->assertSame($versionBeforeB, FeedService::feedRevision((int) $familyB->id));
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
}
