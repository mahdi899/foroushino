<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostBlockType;
use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostType;
use App\Http\Controllers\Controller;
use App\Models\FamilyComment;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyBrandingService;
use App\Services\Family\FamilyCommentModerationService;
use App\Services\Family\FamilyNotificationService;
use App\Services\Family\FamilyPostPublisher;
use App\Support\ApiResponse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CommentModerationController extends Controller
{
    public function __construct(
        private readonly FamilyCommentModerationService $moderation,
        private readonly AdminAuditLogger $audit,
        private readonly FamilyNotificationService $notifications,
        private readonly FamilyBrandingService $branding,
        private readonly FamilyPostPublisher $publisher,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tab = (string) $request->query('tab', 'pending');

        $query = FamilyComment::query()
            ->whereNull('parent_id')
            ->with([
                'user:id,name,is_admin',
                'family:id,internal_name',
                'post:id,type,published_at',
                'post.blocks' => fn ($q) => $q->orderBy('position'),
                // Include all reply statuses so pending member replies appear under the root.
                'replies' => fn ($q) => $q
                    ->with('user:id,name,is_admin')
                    ->orderBy('id'),
            ]);

        // Root matches the tab, or has a reply that matches (e.g. pending reply under approved root).
        $query->where(function (Builder $group) use ($tab) {
            $group->where(function (Builder $self) use ($tab) {
                $this->applyTabFilter($self, $tab);
            })->orWhereHas('replies', function (Builder $replies) use ($tab) {
                $this->applyTabFilter($replies, $tab);
            });
        });

        $this->applySearchFilter($query, $request->query('search'));

        if ($request->filled('post_id')) {
            $query->where('post_id', (int) $request->query('post_id'));
        }

        if ($request->filled('family_id')) {
            $query->where('family_id', (int) $request->query('family_id'));
        }

        $comments = $query->orderByDesc('id')->paginate(min(50, (int) $request->query('per_page', 20)));

        $items = collect($comments->items())->map(fn (FamilyComment $c) => $this->present($c));

        return ApiResponse::success($items, 200, [
            'current_page' => $comments->currentPage(),
            'last_page' => $comments->lastPage(),
            'total' => $comments->total(),
        ]);
    }

    /**
     * Posts that have comments matching the moderation tab, keyed by (post, family).
     * Used by Family Manager hub: group by family, open «مشاهده کامنت‌ها» per row.
     */
    public function threads(Request $request): JsonResponse
    {
        $tab = (string) $request->query('tab', 'pending');
        $perPage = min(50, max(1, (int) $request->query('per_page', 20)));

        $commentsTable = (new FamilyComment)->getTable();
        $postsTable = (new \App\Models\FamilyPost)->getTable();

        // Qualify comment columns: join with posts makes `status` / `is_important` ambiguous on MySQL.
        $base = FamilyComment::query();
        $this->applyTabFilter($base, $tab, $commentsTable);
        $this->applySearchFilter($base, $request->query('search'));

        if ($request->filled('family_id')) {
            $base->where("{$commentsTable}.family_id", (int) $request->query('family_id'));
        }

        $pendingStatus = FamilyCommentStatus::Pending->value;

        // matching_count = all comments matching the tab (roots + replies), same as feed
        // approved_comments_count for the approved tab.
        $paginator = (clone $base)
            ->join($postsTable, "{$postsTable}.id", '=', "{$commentsTable}.post_id")
            ->select([
                "{$commentsTable}.post_id",
                "{$commentsTable}.family_id",
                DB::raw("COUNT(*) as matching_count"),
                DB::raw("MAX({$commentsTable}.created_at) as latest_comment_at"),
                DB::raw("MAX({$commentsTable}.id) as latest_comment_id"),
                DB::raw("MAX({$postsTable}.published_at) as post_published_at"),
                DB::raw(
                    "SUM(CASE WHEN {$commentsTable}.status = ".DB::getPdo()->quote($pendingStatus).' THEN 1 ELSE 0 END) as pending_count'
                ),
                DB::raw(
                    "SUM(CASE WHEN {$commentsTable}.seen_by_bahram_at IS NULL THEN 1 ELSE 0 END) as unread_in_tab"
                ),
            ])
            ->groupBy("{$commentsTable}.post_id", "{$commentsTable}.family_id")
            ->orderByDesc('post_published_at')
            ->orderByDesc("{$commentsTable}.post_id")
            ->paginate($perPage);

        $rows = collect($paginator->items());
        $postIds = $rows->pluck('post_id')->unique()->values();
        $familyIds = $rows->pluck('family_id')->unique()->values();
        $latestIds = $rows->pluck('latest_comment_id')->filter()->values();

        $posts = \App\Models\FamilyPost::query()
            ->whereIn('id', $postIds)
            ->with(['blocks' => fn ($q) => $q->orderBy('position')])
            ->get()
            ->keyBy('id');

        $families = \App\Models\Family::query()
            ->whereIn('id', $familyIds)
            ->get(['id', 'internal_name'])
            ->keyBy('id');

        $latestComments = FamilyComment::query()
            ->whereIn('id', $latestIds)
            ->get(['id', 'body', 'created_at', 'status'])
            ->keyBy('id');

        // Absolute pending / unread for the returned post×family rows (not limited to tab filter).
        $pendingByKey = [];
        $unreadByKey = [];
        if ($rows->isNotEmpty()) {
            $pairFilter = function (Builder $q) use ($rows) {
                foreach ($rows as $row) {
                    $q->orWhere(function (Builder $inner) use ($row) {
                        $inner->where('post_id', $row->post_id)->where('family_id', $row->family_id);
                    });
                }
            };

            if ($tab !== 'pending') {
                $pendingRows = FamilyComment::query()
                    ->select(['post_id', 'family_id', DB::raw('COUNT(*) as pending_count')])
                    ->where('status', $pendingStatus)
                    ->where($pairFilter)
                    ->groupBy('post_id', 'family_id')
                    ->get();

                foreach ($pendingRows as $pendingRow) {
                    $pendingByKey[$pendingRow->post_id.':'.$pendingRow->family_id] = (int) $pendingRow->pending_count;
                }
            }

            $unreadRows = FamilyComment::query()
                ->select(['post_id', 'family_id', DB::raw('COUNT(*) as unread_count')])
                ->whereNull('seen_by_bahram_at')
                ->where($pairFilter)
                ->groupBy('post_id', 'family_id')
                ->get();

            foreach ($unreadRows as $unreadRow) {
                $unreadByKey[$unreadRow->post_id.':'.$unreadRow->family_id] = (int) $unreadRow->unread_count;
            }
        }

        $items = $rows->map(function ($row) use ($posts, $families, $latestComments, $tab, $pendingByKey, $unreadByKey) {
            $post = $posts->get($row->post_id);
            $family = $families->get($row->family_id);
            $latest = $latestComments->get($row->latest_comment_id);
            $key = $row->post_id.':'.$row->family_id;

            $pendingCount = $tab === 'pending'
                ? (int) ($row->pending_count ?? 0)
                : (int) ($pendingByKey[$key] ?? $row->pending_count ?? 0);

            return [
                'post_id' => (int) $row->post_id,
                'family_id' => (int) $row->family_id,
                'family_internal_name' => $family?->internal_name,
                'post_type' => $post?->type?->value ?? $post?->type,
                'post_preview' => $this->postPreview($post),
                'published_at' => $post?->published_at?->toIso8601String()
                    ?? ($row->post_published_at
                        ? \Illuminate\Support\Carbon::parse($row->post_published_at)->toIso8601String()
                        : null),
                'matching_count' => (int) $row->matching_count,
                'pending_count' => $pendingCount,
                'unread_count' => (int) ($unreadByKey[$key] ?? $row->unread_in_tab ?? 0),
                'latest_comment_at' => $row->latest_comment_at
                    ? \Illuminate\Support\Carbon::parse($row->latest_comment_at)->toIso8601String()
                    : null,
                'latest_comment_preview' => $latest?->body,
            ];
        })->values();

        return ApiResponse::success($items, 200, [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ]);
    }

    public function approve(Request $request, FamilyComment $comment): JsonResponse
    {
        abort_if($comment->status === FamilyCommentStatus::Approved, 422, 'این نظر قبلاً تأیید شده است.');

        $this->moderation->approve($comment, $request->user());

        return ApiResponse::success($this->present($comment->fresh(['user', 'family'])));
    }

    public function reject(Request $request, FamilyComment $comment): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', Rule::enum(FamilyCommentRejectionReason::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $reason = FamilyCommentRejectionReason::from($data['reason']);
        $this->moderation->reject($comment, $reason, $data['note'] ?? null, $request->user());

        return ApiResponse::success($this->present($comment->fresh(['user', 'family'])));
    }

    public function batchApprove(Request $request): JsonResponse
    {
        $data = $request->validate([
            'comment_ids' => ['required', 'array', 'min:1'],
            'comment_ids.*' => ['integer', 'exists:family_comments,id'],
        ]);

        $comments = FamilyComment::query()
            ->whereIn('id', $data['comment_ids'])
            ->where('status', FamilyCommentStatus::Pending->value)
            ->get();

        foreach ($comments as $comment) {
            $this->moderation->approve($comment, $request->user());
        }

        $this->audit->log($request->user(), 'family.comments_batch_approved', null, [
            'comment_ids' => $data['comment_ids'],
            'count' => $comments->count(),
        ]);

        return ApiResponse::success(['approved' => $comments->count()]);
    }

    public function markImportant(Request $request, FamilyComment $comment): JsonResponse
    {
        $important = ! (bool) $comment->is_important;

        $comment->update([
            'is_important' => $important,
            'featured_at' => $important ? now() : null,
        ]);

        $this->audit->log($request->user(), 'family.comment_marked_important', $comment, [
            'is_important' => $important,
        ]);

        $fresh = $comment->fresh(['user', 'family', 'user.profile']);
        if ($fresh) {
            $this->moderation->broadcastVisibleUpdate($fresh);
        }

        return ApiResponse::success($this->present($fresh ?? $comment));
    }

    public function togglePulse(Request $request, FamilyComment $comment): JsonResponse
    {
        abort_unless($comment->status === FamilyCommentStatus::Approved, 422, 'فقط نظرات تأییدشده قابل نمایش در Family Pulse هستند.');

        $comment->update([
            'family_pulse_at' => $comment->family_pulse_at ? null : now(),
        ]);

        $this->audit->log($request->user(), 'family.pulse_toggled', $comment, [
            'in_pulse' => $comment->family_pulse_at !== null,
        ]);

        Cache::forget('family:pulse');

        return ApiResponse::success($this->present($comment->fresh(['user', 'family'])));
    }

    public function markSeen(Request $request, FamilyComment $comment): JsonResponse
    {
        if (! $comment->seen_by_bahram_at) {
            $comment->update(['seen_by_bahram_at' => now()]);
        }

        return ApiResponse::success(['seen' => true]);
    }

    public function reply(Request $request, FamilyComment $comment): JsonResponse
    {
        abort_if($comment->parent_id !== null, 422, 'فقط به نظر اصلی می‌توان پاسخ داد.');

        $data = $request->validate([
            'type' => ['required', 'in:text,voice'],
            'text' => ['required_if:type,text', 'nullable', 'string', 'max:2000'],
            'media_id' => ['required_if:type,voice', 'nullable', 'integer', 'exists:family_media,id'],
        ]);

        if ($data['type'] === 'voice') {
            return $this->replyWithVoicePost($request, $comment, $data);
        }

        $reply = $this->moderation->addApprovedReply(
            $comment,
            $request->user(),
            trim((string) $data['text']),
        );

        return ApiResponse::success($this->present($reply), 201);
    }

    /**
     * Legacy voice replies still publish as feed posts (comments have no media field).
     *
     * @param  array{type: string, text?: ?string, media_id?: ?int}  $data
     */
    private function replyWithVoicePost(Request $request, FamilyComment $comment, array $data): JsonResponse
    {
        $post = $this->publisher->createDraft($request->user(), [
            'type' => FamilyPostType::Reply->value,
            'audience_mode' => FamilyPostAudienceMode::Include->value,
            'family_ids' => [$comment->family_id],
            'blocks' => [['type' => 'audio', 'position' => 0, 'media_id' => $data['media_id']]],
            'reply_to_comment_id' => $comment->id,
        ]);

        $published = $this->publisher->publish($request->user(), $post);

        $this->audit->log($request->user(), 'family.bahram_replied', $comment, ['post_id' => $published->id]);

        if ($comment->user) {
            $this->notifications->bahramReplied($comment->user, (int) $published->id);
        }

        return ApiResponse::success(\App\Support\FamilyManagerPostPresenter::present($published), 201);
    }

    private function applyTabFilter(Builder $query, string $tab, ?string $table = null): void
    {
        $col = fn (string $name) => $table ? "{$table}.{$name}" : $name;

        match ($tab) {
            'approved' => $query->where($col('status'), FamilyCommentStatus::Approved->value),
            'rejected' => $query->where($col('status'), FamilyCommentStatus::Rejected->value),
            'important' => $query->where($col('is_important'), true),
            'unread' => $query->whereNull($col('seen_by_bahram_at')),
            'coaching_questions' => $query->whereJsonContains($col('ai_signals'), 'coaching_question'),
            default => $query->where($col('status'), FamilyCommentStatus::Pending->value),
        };
    }

    /** Filter by comment body or author display name (roots or nested replies). */
    private function applySearchFilter(Builder $query, mixed $search): void
    {
        $term = trim((string) $search);
        if ($term === '') {
            return;
        }

        $like = '%'.addcslashes($term, '%_\\').'%';
        $commentsTable = $query->getModel()->getTable();

        $query->where(function (Builder $inner) use ($like, $commentsTable) {
            $inner->where("{$commentsTable}.body", 'like', $like)
                ->orWhereHas('user', function (Builder $userQuery) use ($like) {
                    $userQuery->where('name', 'like', $like);
                })
                ->orWhereHas('replies', function (Builder $replies) use ($like) {
                    $replies->where('body', 'like', $like)
                        ->orWhereHas('user', function (Builder $userQuery) use ($like) {
                            $userQuery->where('name', 'like', $like);
                        });
                });
        });
    }

    private function postPreview(?\App\Models\FamilyPost $post): ?string
    {
        if (! $post) {
            return null;
        }

        $blocks = $post->relationLoaded('blocks') ? $post->blocks : collect();

        $textBlock = $blocks->first(
            fn ($block) => ($block->type === FamilyPostBlockType::Text || ($block->type?->value ?? $block->type) === 'text')
                && filled($block->text_content)
        );

        if ($textBlock) {
            return mb_substr(trim((string) $textBlock->text_content), 0, 160);
        }

        $first = $blocks->first();
        $blockType = $first?->type?->value ?? $first?->type;
        $postType = $post->type instanceof FamilyPostType ? $post->type : FamilyPostType::tryFrom((string) $post->type);

        return match ($blockType) {
            'audio' => 'پیام صوتی',
            'video' => $postType === FamilyPostType::VideoNote ? 'پیام ویدیویی دایره‌ای' : 'ویدیو',
            'image' => 'تصویر',
            'article_reference' => 'اشاره به مقاله',
            default => match ($postType) {
                FamilyPostType::Voice => 'پیام صوتی',
                FamilyPostType::Video => 'ویدیو',
                FamilyPostType::VideoNote => 'پیام ویدیویی دایره‌ای',
                FamilyPostType::Image, FamilyPostType::ImageAlbum => 'تصویر',
                FamilyPostType::Article => 'مقاله',
                FamilyPostType::Reply => 'پاسخ بهرام',
                default => null,
            },
        };
    }

    /** @return array<string, mixed> */
    private function present(FamilyComment $comment): array
    {
        $branding = $this->branding->publicPayload();

        return [
            'id' => $comment->id,
            'body' => $comment->body,
            'status' => $comment->status?->value ?? $comment->status,
            'created_at' => $comment->created_at?->toIso8601String(),
            'is_important' => (bool) $comment->is_important,
            'in_pulse' => $comment->family_pulse_at !== null,
            'seen_by_bahram' => $comment->seen_by_bahram_at !== null,
            'parent_id' => $comment->parent_id,
            'is_bahram_reply' => $comment->parent_id !== null && (bool) ($comment->user?->is_admin),
            'user' => [
                'name' => ($comment->parent_id !== null && (bool) ($comment->user?->is_admin))
                    ? $branding['profile_name']
                    : $comment->user?->name,
            ],
            'family' => [
                'id' => $comment->family_id,
                'internal_name' => $comment->family?->internal_name,
            ],
            'post_id' => $comment->post_id,
            'family_id' => $comment->family_id,
            'post_type' => $comment->relationLoaded('post')
                ? ($comment->post?->type?->value ?? $comment->post?->type)
                : null,
            'post_preview' => $comment->relationLoaded('post') ? $this->postPreview($comment->post) : null,
            'published_at' => $comment->relationLoaded('post')
                ? $comment->post?->published_at?->toIso8601String()
                : null,
            'ai' => [
                'risk_score' => $comment->ai_risk_score !== null ? (float) $comment->ai_risk_score : null,
                'sentiment' => $comment->ai_sentiment,
                'topic' => $comment->ai_topic,
                'signals' => $comment->ai_signals,
            ],
            'rejection_reason' => $comment->rejection_reason?->value,
            'rejection_note' => $comment->rejection_note,
            'replies' => $comment->relationLoaded('replies')
                ? $comment->replies
                    ->sortBy(fn (FamilyComment $reply) => [
                        $reply->user?->is_admin ? 0 : 1,
                        $reply->id,
                    ])
                    ->values()
                    ->map(function (FamilyComment $reply) use ($branding, $comment) {
                        $isBahram = (bool) ($reply->user?->is_admin);

                        return [
                            'id' => $reply->id,
                            'body' => $reply->body,
                            'status' => $reply->status?->value ?? $reply->status,
                            'created_at' => $reply->created_at?->toIso8601String(),
                            'is_important' => (bool) $reply->is_important,
                            'in_pulse' => $reply->family_pulse_at !== null,
                            'seen_by_bahram' => $reply->seen_by_bahram_at !== null,
                            'parent_id' => $reply->parent_id,
                            'is_bahram_reply' => $isBahram,
                            'post_id' => $reply->post_id ?? $comment->post_id,
                            'family_id' => $reply->family_id ?? $comment->family_id,
                            'user' => [
                                'name' => $isBahram ? $branding['profile_name'] : $reply->user?->name,
                            ],
                            'ai' => [
                                'risk_score' => $reply->ai_risk_score !== null ? (float) $reply->ai_risk_score : null,
                                'sentiment' => $reply->ai_sentiment,
                                'topic' => $reply->ai_topic,
                                'signals' => $reply->ai_signals,
                            ],
                            'rejection_reason' => $reply->rejection_reason?->value,
                            'rejection_note' => $reply->rejection_note,
                            'replies' => [],
                        ];
                    })->all()
                : [],
        ];
    }
}
