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
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class FeedService
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
        private readonly FamilyActionStatsService $actionStats,
        private readonly FamilyBrandingService $branding,
    ) {}

    /**
     * @return array{data: Collection<int, FamilyPost>, next_cursor: ?string, membership: \App\Models\FamilyMembership}
     */
    public function forMember(
        User $user,
        ?string $cursor = null,
        ?int $limit = null,
        ?FamilyMembership $membership = null,
    ): array {
        $membership = $membership ?? $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;
        $limit = $limit ?? (int) config('family.feed.per_page', 4);

        $query = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->whereNotNull('published_at');

        $this->audience->scopeVisibleToFamily($query, $familyId);

        if ($cursor) {
            [$publishedAt, $id] = $this->decodeCursor($cursor);
            $query->where(function ($q) use ($publishedAt, $id) {
                $q->where('published_at', '<', $publishedAt)
                    ->orWhere(function ($q2) use ($publishedAt, $id) {
                        $q2->where('published_at', '=', $publishedAt)
                            ->where('id', '<', $id);
                    });
            });
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

        $this->attachUserReactions($posts, $user->id);
        $this->attachCommentPreviews($posts, $familyId);
        $this->attachActionResults($posts, $familyId);
        $this->attachUserActionResponses($posts, $user->id);
        $this->applyBrandingAuthor($posts);

        $nextCursor = null;
        if ($hasMore && $posts->isNotEmpty()) {
            $last = $posts->last();
            $nextCursor = $this->encodeCursor($last->published_at?->toIso8601String() ?? '', (int) $last->id);
        }

        return [
            'data' => $posts,
            'next_cursor' => $nextCursor,
            'membership' => $membership,
        ];
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
     *
     * @return array{unread_count: int, latest_post_id: int}
     */
    public function unreadSummary(int $afterId): array
    {
        $base = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->whereNotNull('published_at');

        $latestId = (int) ((clone $base)->max('id') ?? 0);
        $unreadCount = $afterId > 0
            ? (int) (clone $base)->where('id', '>', $afterId)->count()
            : 0;

        return [
            'unread_count' => $unreadCount,
            'latest_post_id' => $latestId,
        ];
    }
}
