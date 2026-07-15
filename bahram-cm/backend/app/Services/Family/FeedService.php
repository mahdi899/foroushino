<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostStatus;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Models\User;
use Illuminate\Support\Collection;

class FeedService
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
        private readonly ActionResultStatsBuilder $actionResults,
        private readonly FamilyBrandingService $branding,
    ) {}

    /**
     * @return array{data: Collection<int, FamilyPost>, next_cursor: ?string, membership: \App\Models\FamilyMembership}
     */
    public function forMember(User $user, ?string $cursor = null, ?int $limit = null): array
    {
        $membership = $this->access->requireMembership($user);
        $familyId = (int) $membership->family_id;
        $limit = $limit ?? (int) config('family.feed.per_page', 4);

        $query = FamilyPost::query()
            ->where('status', FamilyPostStatus::Published->value)
            ->whereNotNull('published_at')
            ->where('is_pinned', false);

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
    public function pinnedForMember(User $user): Collection
    {
        $membership = $this->access->requireMembership($user);
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

        $grouped = FamilyComment::query()
            ->whereIn('post_id', $posts->pluck('id'))
            ->where('family_id', $familyId)
            ->where('status', FamilyCommentStatus::Approved->value)
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

        $actionIds = $posts
            ->flatMap(fn (FamilyPost $post) => $post->actions->pluck('id'))
            ->unique()
            ->values();

        if ($actionIds->isEmpty()) {
            return;
        }

        $responses = FamilyActionResponse::query()
            ->where('family_id', $familyId)
            ->whereIn('action_id', $actionIds)
            ->get(['action_id', 'value'])
            ->groupBy('action_id');

        foreach ($posts as $post) {
            foreach ($post->actions as $action) {
                $action->setAttribute(
                    'result_stats',
                    $this->actionResults->build($action, $responses->get($action->id, collect()))
                );
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
}
