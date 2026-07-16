<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class FeedService
{
    private const FEED_CACHE_VERSION_KEY = 'family:feed:version';

    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
        private readonly FamilyActionStatsService $actionStats,
        private readonly FamilyBrandingService $branding,
    ) {}

    /**
     * Fetch a chronological window centered on an arbitrary post — lets the UI "jump"
     * straight to any post (e.g. an old pinned message) in a single request instead of
     * paginating backward page-by-page from the tip.
     *
     * @return array{data: Collection<int, FamilyPost>, next_cursor: ?string, prev_cursor: ?string, has_newer: bool, has_older: bool, membership: FamilyMembership}
     */
    public function jumpToPost(
        User $user,
        FamilyPost $post,
        ?FamilyMembership $membership = null,
        int $before = 12,
        int $after = 12,
    ): array {
        $membership = $membership ?? $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;

        // Pass the Carbon instance (not a pre-formatted string) into query bindings — Laravel
        // reformats DateTimeInterface bindings via the connection grammar's date format, which
        // matches how `published_at` is actually stored. A hand-formatted ISO8601 string (with
        // "T" + timezone offset) compared lexicographically against SQLite's stored
        // "Y-m-d H:i:s" text broke ordering entirely in tests (SQLite has no real DATETIME type).
        $publishedAt = $post->published_at ?? now();
        $id = (int) $post->id;

        $baseQuery = fn () => $this->audience->scopeVisibleToFamily(
            FamilyPost::query()
                ->where('status', FamilyPostStatus::Published->value)
                ->whereNotNull('published_at'),
            $familyId,
        );

        // Posts newer than the target — fetched ascending (closest-to-target first) so the
        // limit keeps the posts nearest the target, then reversed into feed (desc) order.
        $newerRaw = $baseQuery()
            ->where(function ($q) use ($publishedAt, $id) {
                $q->where('published_at', '>', $publishedAt)
                    ->orWhere(function ($q2) use ($publishedAt, $id) {
                        $q2->where('published_at', '=', $publishedAt)
                            ->where('id', '>', $id);
                    });
            })
            ->orderBy('published_at')
            ->orderBy('id')
            ->limit($after + 1)
            ->get(['id']);

        $hasNewer = $newerRaw->count() > $after;
        $newerIds = $newerRaw->take($after)->reverse()->pluck('id')->values();

        // Posts older than the target — same shape as the standard cursor page.
        $olderRaw = $baseQuery()
            ->where(function ($q) use ($publishedAt, $id) {
                $q->where('published_at', '<', $publishedAt)
                    ->orWhere(function ($q2) use ($publishedAt, $id) {
                        $q2->where('published_at', '=', $publishedAt)
                            ->where('id', '<', $id);
                    });
            })
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit($before + 1)
            ->get(['id']);

        $hasOlder = $olderRaw->count() > $before;
        $olderIds = $olderRaw->take($before)->pluck('id')->values();

        $orderedIds = $newerIds->concat([$id])->concat($olderIds)->values();

        $posts = FamilyPost::query()
            ->whereIn('id', $orderedIds)
            ->with([
                'author:id,name',
                'blocks' => fn ($q) => $q->orderBy('position'),
                'blocks.media',
                'blocks.article:id,title,slug,excerpt,featured_image,status',
                'actions.options',
                'replyToComment:id,user_id,body,status',
                'replyToComment.user:id,name',
                'stats' => fn ($q) => $q->where('family_id', $familyId),
            ])
            ->get()
            ->sortBy(fn (FamilyPost $p) => $orderedIds->search($p->id))
            ->values();

        $this->attachUserReactions($posts, $user->id);
        $this->attachCommentPreviews($posts, $familyId);
        $this->attachActionResults($posts, $familyId);
        $this->attachUserActionResponses($posts, $user->id);
        $this->applyBrandingAuthor($posts);

        $nextCursor = null;
        if ($hasOlder && $olderIds->isNotEmpty()) {
            $last = $posts->last(fn (FamilyPost $p) => (int) $p->id === (int) $olderIds->last());
            if ($last) {
                $nextCursor = $this->encodeCursor($last->published_at?->toIso8601String() ?? '', (int) $last->id);
            }
        }

        // prev_cursor = newest post in the window — client uses it to load still-newer posts.
        $prevCursor = null;
        if ($posts->isNotEmpty()) {
            $newest = $posts->first();
            if ($newest) {
                $prevCursor = $this->encodeCursor(
                    $newest->published_at?->toIso8601String() ?? '',
                    (int) $newest->id,
                );
            }
        }

        return [
            'data' => $posts,
            'next_cursor' => $nextCursor,
            'prev_cursor' => $hasNewer ? $prevCursor : null,
            'has_newer' => $hasNewer,
            'has_older' => $hasOlder,
            'membership' => $membership,
        ];
    }

    /**
     * @return array{data: Collection<int, FamilyPost>, next_cursor: ?string, prev_cursor: ?string, has_newer: bool, membership: FamilyMembership}
     */
    public function forMember(
        User $user,
        ?string $cursor = null,
        ?int $limit = null,
        ?FamilyMembership $membership = null,
        string $direction = 'older',
    ): array {
        $membership = $membership ?? $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;
        $limit = $limit ?? (int) config('family.feed.per_page', 4);
        $direction = $direction === 'newer' ? 'newer' : 'older';

        // Tip page only caches the older/newest-first tip — never the "newer" direction.
        if ($cursor === null && $direction === 'older') {
            $cacheKey = $this->feedTipCacheKey($familyId, $limit);
            ['data' => $posts, 'next_cursor' => $nextCursor] = Cache::remember(
                $cacheKey,
                (int) config('family.cache.feed_tip_ttl', 8),
                fn () => $this->fetchFeedPage($familyId, null, $limit, 'older'),
            );
            $prevCursor = null;
            $hasNewer = false;
        } else {
            $page = $this->fetchFeedPage($familyId, $cursor, $limit, $direction);
            $posts = $page['data'];
            $nextCursor = $page['next_cursor'];
            $prevCursor = $page['prev_cursor'];
            $hasNewer = $page['has_newer'];
        }

        $this->attachUserReactions($posts, $user->id);
        $this->attachUserActionResponses($posts, $user->id);

        return [
            'data' => $posts,
            'next_cursor' => $nextCursor,
            'prev_cursor' => $prevCursor,
            'has_newer' => $hasNewer,
            'membership' => $membership,
        ];
    }

    /**
     * Shared (family-wide, no per-user fields) feed page — cacheable as-is.
     *
     * @return array{data: Collection<int, FamilyPost>, next_cursor: ?string, prev_cursor: ?string, has_newer: bool}
     */
    private function fetchFeedPage(int $familyId, ?string $cursor, int $limit, string $direction = 'older'): array
    {
        $query = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->whereNotNull('published_at');

        $this->audience->scopeVisibleToFamily($query, $familyId);

        if ($cursor) {
            [$publishedAtRaw, $id] = $this->decodeCursor($cursor);
            $publishedAt = Carbon::parse($publishedAtRaw);

            if ($direction === 'newer') {
                $query->where(function ($q) use ($publishedAt, $id) {
                    $q->where('published_at', '>', $publishedAt)
                        ->orWhere(function ($q2) use ($publishedAt, $id) {
                            $q2->where('published_at', '=', $publishedAt)
                                ->where('id', '>', $id);
                        });
                });
            } else {
                $query->where(function ($q) use ($publishedAt, $id) {
                    $q->where('published_at', '<', $publishedAt)
                        ->orWhere(function ($q2) use ($publishedAt, $id) {
                            $q2->where('published_at', '=', $publishedAt)
                                ->where('id', '<', $id);
                        });
                });
            }
        }

        if ($direction === 'newer') {
            // Closest-to-cursor first (asc), then reverse into feed (desc) order.
            $posts = $query
                ->with([
                    'author:id,name',
                    'blocks' => fn ($q) => $q->orderBy('position'),
                    'blocks.media',
                    'blocks.article:id,title,slug,excerpt,featured_image,status',
                    'actions.options',
                    'replyToComment:id,user_id,body,status',
                    'replyToComment.user:id,name',
                    'stats' => fn ($q) => $q->where('family_id', $familyId),
                ])
                ->orderBy('published_at')
                ->orderBy('id')
                ->limit($limit + 1)
                ->get();

            $hasNewer = $posts->count() > $limit;
            if ($hasNewer) {
                $posts = $posts->take($limit)->values();
            }
            $posts = $posts->reverse()->values();

            $this->attachCommentPreviews($posts, $familyId);
            $this->attachActionResults($posts, $familyId);
            $this->applyBrandingAuthor($posts);

            $prevCursor = null;
            if ($hasNewer && $posts->isNotEmpty()) {
                $newest = $posts->first();
                $prevCursor = $this->encodeCursor(
                    $newest->published_at?->toIso8601String() ?? '',
                    (int) $newest->id,
                );
            }

            return [
                'data' => $posts,
                'next_cursor' => null,
                'prev_cursor' => $prevCursor,
                'has_newer' => $hasNewer,
            ];
        }

        $posts = $query
            ->with([
                'author:id,name',
                'blocks' => fn ($q) => $q->orderBy('position'),
                'blocks.media',
                'blocks.article:id,title,slug,excerpt,featured_image,status',
                'actions.options',
                'replyToComment:id,user_id,body,status',
                'replyToComment.user:id,name',
                'stats' => fn ($q) => $q->where('family_id', $familyId),
            ])
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit($limit + 1)
            ->get();

        $hasMore = $posts->count() > $limit;
        if ($hasMore) {
            $posts = $posts->take($limit)->values();
        }

        $this->attachCommentPreviews($posts, $familyId);
        $this->attachActionResults($posts, $familyId);
        $this->applyBrandingAuthor($posts);

        $nextCursor = null;
        if ($hasMore && $posts->isNotEmpty()) {
            $last = $posts->last();
            $nextCursor = $this->encodeCursor($last->published_at?->toIso8601String() ?? '', (int) $last->id);
        }

        return [
            'data' => $posts,
            'next_cursor' => $nextCursor,
            'prev_cursor' => null,
            'has_newer' => false,
        ];
    }

    private function feedTipCacheKey(int $familyId, int $limit): string
    {
        $version = (int) Cache::get(self::FEED_CACHE_VERSION_KEY, 0);

        return "family:feed:{$familyId}:{$limit}:v{$version}";
    }

    /**
     * Bump the shared feed-tip cache version, invalidating every family's cached tip page
     * at once. Simpler and safer than resolving exactly which families a given post's
     * audience (`all` / `include` / `exclude`) touches, and cheap since publishes are rare
     * relative to feed reads.
     */
    public static function invalidateFeedTipCache(): void
    {
        Cache::increment(self::FEED_CACHE_VERSION_KEY);
        self::invalidateGuestFeedCache();
    }

    public static function feedRevision(): int
    {
        return (int) Cache::get(self::FEED_CACHE_VERSION_KEY, 0);
    }

    public static function invalidateGuestFeedCache(): void
    {
        $limit = (int) config('family.feed.guest_preview_posts', 1);
        Cache::forget("family:guest_feed:{$limit}");
        // Also clear a few common limit variants used by clients.
        foreach ([1, 2, 3, 4, 5, 10, 15] as $n) {
            Cache::forget("family:guest_feed:{$n}");
        }
    }

    /**
     * @return array{data: Collection<int, FamilyPost>, next_cursor: null}
     */
    public function guestPreview(?int $limit = null): array
    {
        $limit = $limit ?? (int) config('family.feed.guest_preview_posts', 1);
        $cacheKey = "family:guest_feed:{$limit}";

        return Cache::remember(
            $cacheKey,
            config('family.cache.guest_feed_ttl', 30),
            fn () => $this->buildGuestPreview($limit),
        );
    }

    /**
     * @return array{data: Collection<int, FamilyPost>, next_cursor: null}
     */
    private function buildGuestPreview(int $limit): array
    {
        $posts = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->where('audience_mode', 'all')
            ->whereNotNull('published_at')
            ->with([
                'author:id,name',
                'blocks' => fn ($q) => $q->orderBy('position'),
                'blocks.media',
                'blocks.article:id,title,slug,excerpt,featured_image,status',
                'actions.options',
            ])
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        $this->applyBrandingAuthor($posts);

        return [
            'data' => $posts,
            'next_cursor' => null,
        ];
    }

    /**
     * @return Collection<int, FamilyPost>
     */
    public function pinnedForMember(User $user, ?FamilyMembership $membership = null): Collection
    {
        $membership = $membership ?? $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;

        $query = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->where('is_pinned', true)
            ->whereNotNull('published_at');

        $this->audience->scopeVisibleToFamily($query, $familyId);

        $posts = $query
            ->with([
                'author:id,name',
                'blocks' => fn ($q) => $q->orderBy('position'),
                'blocks.media',
                'blocks.article:id,title,slug,excerpt,featured_image,status',
                'actions.options',
                'replyToComment:id,user_id,body,status',
                'replyToComment.user:id,name',
                'stats' => fn ($q) => $q->where('family_id', $familyId),
            ])
            ->orderByDesc('pinned_at')
            ->get();

        $this->attachUserReactions($posts, $user->id);
        $this->attachCommentPreviews($posts, $familyId);
        $this->attachActionResults($posts, $familyId);
        $this->attachUserActionResponses($posts, $user->id);
        $this->applyBrandingAuthor($posts);

        return $posts;
    }

    private function applyBrandingAuthor(Collection $posts): void
    {
        $branding = $this->branding->publicPayload();

        foreach ($posts as $post) {
            $post->setAttribute('author_display_name', $branding['profile_name']);
            $post->setAttribute('author_avatar', $branding['profile_avatar']);
        }
    }

    private function attachCommentPreviews(Collection $posts, int $familyId): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        $postIds = $posts->pluck('id');
        $approved = FamilyCommentStatus::Approved->value;

        $commentIds = FamilyComment::query()
            ->from('family_comments as c1')
            ->select('c1.id')
            ->whereIn('c1.post_id', $postIds)
            ->where('c1.family_id', $familyId)
            ->where('c1.status', $approved)
            ->whereRaw(
                '(SELECT COUNT(*) FROM family_comments c2
                  WHERE c2.post_id = c1.post_id
                    AND c2.family_id = c1.family_id
                    AND c2.status = ?
                    AND c2.id > c1.id) < 3',
                [$approved],
            )
            ->pluck('id');

        $grouped = FamilyComment::query()
            ->whereIn('id', $commentIds)
            ->with(['user:id,name', 'user.profile'])
            ->orderByDesc('id')
            ->get()
            ->groupBy('post_id');

        foreach ($posts as $post) {
            $post->setAttribute(
                'comment_preview',
                ($grouped->get($post->id) ?? collect())->take(3)->values()
            );
        }
    }

    private function attachActionResults(Collection $posts, int $familyId): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        foreach ($posts as $post) {
            foreach ($post->actions as $action) {
                $action->setAttribute(
                    'result_stats',
                    $this->actionStats->forAction($familyId, $action),
                );
            }
        }
    }

    private function attachUserActionResponses(Collection $posts, int $userId): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        $actionIds = $posts
            ->flatMap(fn (FamilyPost $post) => $post->relationLoaded('actions') ? $post->actions->pluck('id') : [])
            ->filter()
            ->unique()
            ->values();

        if ($actionIds->isEmpty()) {
            return;
        }

        $responses = FamilyActionResponse::query()
            ->where('user_id', $userId)
            ->whereIn('action_id', $actionIds)
            ->get(['action_id', 'value'])
            ->keyBy('action_id');

        foreach ($posts as $post) {
            if (! $post->relationLoaded('actions')) {
                continue;
            }

            foreach ($post->actions as $action) {
                $response = $responses->get($action->id);
                $action->setAttribute('responded', $response !== null);
                $action->setAttribute('user_response', $response?->value);
            }
        }
    }

    private function attachUserReactions(Collection $posts, int $userId): void
    {
        if ($posts->isEmpty()) {
            return;
        }

        $reactions = FamilyReaction::query()
            ->where('user_id', $userId)
            ->whereIn('post_id', $posts->pluck('id'))
            ->get()
            ->keyBy('post_id');

        foreach ($posts as $post) {
            $post->setAttribute('user_reaction', $reactions->get($post->id)?->type?->value);
        }
    }

    private function encodeCursor(string $publishedAt, int $id): string
    {
        return rtrim(strtr(base64_encode("{$publishedAt}|{$id}"), '+/', '-_'), '=');
    }

    /**
     * @return array{0: string, 1: int}
     */
    private function decodeCursor(string $cursor): array
    {
        $padded = strtr($cursor, '-_', '+/');
        $pad = strlen($padded) % 4;
        if ($pad) {
            $padded .= str_repeat('=', 4 - $pad);
        }

        $decoded = base64_decode($padded, true);
        if ($decoded === false || ! str_contains($decoded, '|')) {
            abort(422, 'کرسر نامعتبر است.');
        }

        [$publishedAt, $id] = explode('|', $decoded, 2);

        return [$publishedAt, (int) $id];
    }

    /**
     * Lightweight badge payload for the site "خانواده" nav and feed jump FAB.
     * Scoped to the member's family audience when authenticated.
     *
     * @return array{unread_count: int, latest_post_id: int, feed_revision: int}
     */
    public function unreadSummary(int $afterId, ?User $user = null): array
    {
        $membership = $user ? $this->access->homeMembership($user) : null;

        $base = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->whereNotNull('published_at');

        if ($membership) {
            $this->audience->scopeVisibleToFamily($base, (int) $membership->family_id);
        } else {
            // Guests only see audience=all posts.
            $base->where('audience_mode', 'all');
        }

        $latest = (clone $base)
            ->orderByDesc('published_at')
            ->orderByDesc('id')
            ->first(['id', 'published_at']);

        $latestId = (int) ($latest?->id ?? 0);

        if ($afterId <= 0 || ! $latest) {
            return $this->withFeedRevision([
                'unread_count' => 0,
                'latest_post_id' => $latestId,
            ]);
        }

        if ((int) $latest->id === $afterId) {
            return $this->withFeedRevision([
                'unread_count' => 0,
                'latest_post_id' => $latestId,
            ]);
        }

        $anchor = FamilyPost::query()
            ->where('id', $afterId)
            ->where('status', FamilyPostStatus::Published->value)
            ->first(['id', 'published_at']);

        if (! $anchor || ! $anchor->published_at) {
            $unreadCount = (int) (clone $base)->where('id', '>', $afterId)->count();

            return $this->withFeedRevision([
                'unread_count' => $unreadCount,
                'latest_post_id' => $latestId,
            ]);
        }

        $unreadCount = (int) (clone $base)
            ->where(function ($q) use ($anchor) {
                $q->where('published_at', '>', $anchor->published_at)
                    ->orWhere(function ($q2) use ($anchor) {
                        $q2->where('published_at', '=', $anchor->published_at)
                            ->where('id', '>', $anchor->id);
                    });
            })
            ->count();

        return $this->withFeedRevision([
            'unread_count' => $unreadCount,
            'latest_post_id' => $latestId,
        ]);
    }

    /** @param  array{unread_count: int, latest_post_id: int}  $payload */
    private function withFeedRevision(array $payload): array
    {
        return [
            ...$payload,
            'feed_revision' => self::feedRevision(),
        ];
    }
}
