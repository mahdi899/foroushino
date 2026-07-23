<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Models\FamilyMedia;
use App\Models\FamilyStory;
use App\Models\FamilyStoryTarget;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

final class FamilyStoryService
{
    private const REVISION_KEY = 'family:stories:revision';

    public function __construct(
        private readonly StoryAudienceResolver $audience,
    ) {}

    /** @return Collection<int, FamilyStory> */
    public function activeStories(?int $familyId = null): Collection
    {
        $query = FamilyStory::query()
            ->active()
            ->with(['media', 'publisher:id,name']);

        if ($familyId === null || $familyId === FamilyMetaCacheService::GUEST_FAMILY_ID) {
            $query->where('audience_mode', FamilyPostAudienceMode::All->value);
        } else {
            $this->audience->scopeVisibleToFamily($query, $familyId);
        }

        return $query->orderBy('published_at')->get();
    }

    public function hasActiveStories(?int $familyId = null): bool
    {
        $familyKey = $familyId ?? FamilyMetaCacheService::GUEST_FAMILY_ID;

        return (bool) Cache::remember(
            $this->flagKey($familyKey),
            config('family.cache.stories_flag_ttl', 60),
            function () use ($familyId) {
                $query = FamilyStory::query()->active();

                if ($familyId === null || $familyId === FamilyMetaCacheService::GUEST_FAMILY_ID) {
                    $query->where('audience_mode', FamilyPostAudienceMode::All->value);
                } else {
                    $this->audience->scopeVisibleToFamily($query, $familyId);
                }

                return $query->exists();
            },
        );
    }

    public function latestActiveStoryId(?int $familyId = null): ?int
    {
        if (! $this->hasActiveStories($familyId)) {
            return null;
        }

        $query = FamilyStory::query()->active();

        if ($familyId === null || $familyId === FamilyMetaCacheService::GUEST_FAMILY_ID) {
            $query->where('audience_mode', FamilyPostAudienceMode::All->value);
        } else {
            $this->audience->scopeVisibleToFamily($query, $familyId);
        }

        $id = $query->max('id');

        return $id !== null ? (int) $id : null;
    }

    /**
     * @param  list<int>  $familyIds
     */
    public function publish(
        User $user,
        FamilyMedia $media,
        ?string $caption = null,
        string $audienceMode = 'all',
        array $familyIds = [],
    ): FamilyStory {
        $mode = FamilyPostAudienceMode::tryFrom($audienceMode) ?? FamilyPostAudienceMode::All;
        if ($mode === FamilyPostAudienceMode::All) {
            $familyIds = [];
        }

        $now = now();

        $story = DB::transaction(function () use ($user, $media, $caption, $mode, $familyIds, $now) {
            $story = FamilyStory::query()->create([
                'media_id' => $media->id,
                'caption' => $caption,
                'audience_mode' => $mode->value,
                'published_by' => $user->id,
                'published_at' => $now,
                'expires_at' => $now->copy()->addDay(),
            ]);

            $this->syncTargets($story, $familyIds);

            return $story->load(['media', 'publisher:id,name', 'targets.family:id,internal_name']);
        });

        $this->bumpRevision();
        app(FamilyMetaCacheService::class)->forgetAllMeta();

        return $story;
    }

    public function delete(FamilyStory $story): void
    {
        $story->delete();
        $this->bumpRevision();
        app(FamilyMetaCacheService::class)->forgetAllMeta();
    }

    public function recordView(FamilyStory $story, User $user): void
    {
        DB::table('family_story_views')->upsert(
            [
                'story_id' => $story->id,
                'user_id' => $user->id,
                'viewed_at' => now(),
            ],
            ['story_id', 'user_id'],
            ['viewed_at'],
        );
    }

    /** @return Collection<int, array{id: int, name: ?string, mobile: ?string, viewed_at: string}> */
    public function viewers(FamilyStory $story, int $limit = 100): Collection
    {
        return DB::table('family_story_views')
            ->join('users', 'users.id', '=', 'family_story_views.user_id')
            ->where('family_story_views.story_id', $story->id)
            ->orderByDesc('family_story_views.viewed_at')
            ->limit($limit)
            ->get([
                'users.id',
                'users.name',
                'users.mobile',
                'family_story_views.viewed_at',
            ])
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'mobile' => $row->mobile,
                'viewed_at' => $row->viewed_at,
            ]);
    }

    public function viewsCount(FamilyStory $story): int
    {
        return (int) DB::table('family_story_views')->where('story_id', $story->id)->count();
    }

    /** @param  list<int>  $familyIds */
    private function syncTargets(FamilyStory $story, array $familyIds): void
    {
        FamilyStoryTarget::query()->where('story_id', $story->id)->delete();

        foreach (array_unique($familyIds) as $familyId) {
            FamilyStoryTarget::query()->create([
                'story_id' => $story->id,
                'family_id' => (int) $familyId,
            ]);
        }
    }

    private function bumpRevision(): void
    {
        Cache::forever(self::REVISION_KEY, ((int) Cache::get(self::REVISION_KEY, 0)) + 1);
    }

    private function flagKey(int $familyId): string
    {
        $rev = (int) Cache::get(self::REVISION_KEY, 0);

        return "family:stories:active:v{$rev}:{$familyId}";
    }
}
