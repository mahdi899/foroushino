<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostStatus;
use App\Models\Family;
use App\Models\FamilyPost;
use Illuminate\Support\Facades\Cache;

/**
 * Lightweight per-family meta + unread summary cache (Redis in production).
 */
final class FamilyMetaCacheService
{
    public const GUEST_FAMILY_ID = 0;

    public function __construct(
        private readonly FamilyBrandingService $branding,
        private readonly FamilyStoryService $stories,
        private readonly FamilyMemberCountService $memberCounts,
        private readonly PostAudienceResolver $audience,
    ) {}

    /** @return array{feed_revision: int, latest_post_id: int, branding_version: ?int, has_active_stories: bool, member_count: ?int} */
    public function metaForFamily(int $familyId): array
    {
        return Cache::remember(
            $this->metaKey($familyId),
            (int) config('family.cache.meta_ttl', 30),
            fn () => $this->buildMeta($familyId),
        );
    }

    public function forgetMeta(int $familyId): void
    {
        Cache::forget($this->metaKey($familyId));
    }

    public function forgetMetaForFamilies(array $familyIds): void
    {
        foreach (array_unique($familyIds) as $familyId) {
            $this->forgetMeta((int) $familyId);
        }
    }

    public function forgetAllMeta(): void
    {
        $this->forgetMeta(self::GUEST_FAMILY_ID);
        foreach (Family::query()->pluck('id') as $familyId) {
            $this->forgetMeta((int) $familyId);
        }
    }

    /**
     * Family IDs whose feed tip / unread may change when a post is published or removed.
     *
     * @return list<int>
     */
    public static function familyIdsAffectedByPost(FamilyPost $post): array
    {
        $post->loadMissing('targets');

        $mode = $post->audience_mode;

        if ($mode === FamilyPostAudienceMode::All || $mode?->value === 'all') {
            return Family::query()->pluck('id')->map(fn ($id) => (int) $id)->all();
        }

        if ($mode === FamilyPostAudienceMode::Include || $mode?->value === 'include') {
            return $post->targets->pluck('family_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        }

        if ($mode === FamilyPostAudienceMode::Exclude || $mode?->value === 'exclude') {
            $excluded = $post->targets->pluck('family_id')->all();

            return Family::query()
                ->when($excluded !== [], fn ($q) => $q->whereNotIn('id', $excluded))
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        return [];
    }

    public function latestPostIdForFamily(int $familyId): int
    {
        if ($familyId === self::GUEST_FAMILY_ID) {
            $latest = FamilyPost::query()
                ->where('status', FamilyPostStatus::Published->value)
                ->where('audience_mode', 'all')
                ->whereNotNull('published_at')
                ->orderByDesc('published_at')
                ->orderByDesc('id')
                ->first(['id']);

            return (int) ($latest?->id ?? 0);
        }

        $query = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->whereNotNull('published_at');

        $this->audience->scopeVisibleToFamily($query, $familyId);

        $latest = $query
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->first(['id']);

        return (int) ($latest?->id ?? 0);
    }

    /** @return array{feed_revision: int, latest_post_id: int, branding_version: ?int, has_active_stories: bool, member_count: ?int} */
    private function buildMeta(int $familyId): array
    {
        $branding = $this->branding->publicPayload();

        return [
            'feed_revision' => FeedService::feedRevision(),
            'latest_post_id' => $this->latestPostIdForFamily($familyId),
            'branding_version' => $branding['branding_version'] ?? null,
            'has_active_stories' => $this->stories->hasActiveStories(),
            'member_count' => $familyId === self::GUEST_FAMILY_ID
                ? (($total = $this->memberCounts->total()) > 0 ? $total : null)
                : null,
        ];
    }

    private function metaKey(int $familyId): string
    {
        return "family:meta:{$familyId}";
    }
}
