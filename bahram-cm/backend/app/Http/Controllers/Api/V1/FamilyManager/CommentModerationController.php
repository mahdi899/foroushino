<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Enums\Family\FamilyPostBlockType;
use App\Http\Controllers\Controller;
use App\Models\FamilyComment;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyNotificationService;
use App\Services\Family\FamilyStatsService;
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
        private readonly FamilyStatsService $stats,
        private readonly AdminAuditLogger $audit,
        private readonly FamilyNotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $tab = (string) $request->query('tab', 'pending');

        $query = FamilyComment::query()
            ->with(['user:id,name', 'family:id,internal_name', 'post:id,type']);

        $this->applyTabFilter($query, $tab);

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

        $base = FamilyComment::query();
        $this->applyTabFilter($base, $tab);

        if ($request->filled('family_id')) {
            $base->where('family_id', (int) $request->query('family_id'));
        }

        $pendingStatus = FamilyCommentStatus::Pending->value;

        $paginator = (clone $base)
            ->select([
                'post_id',
                'family_id',
                DB::raw('COUNT(*) as matching_count'),
                DB::raw('MAX(created_at) as latest_comment_at'),
                DB::raw('MAX(id) as latest_comment_id'),
                DB::raw(
                    'SUM(CASE WHEN status = '.DB::getPdo()->quote($pendingStatus).' THEN 1 ELSE 0 END) as pending_count'
                ),
            ])
            ->groupBy('post_id', 'family_id')
            ->orderByDesc('latest_comment_at')
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

        // Pending counts for groups when tab is not pending (matching_count only covers tab filter).
        $pendingByKey = [];
        if ($tab !== 'pending' && $rows->isNotEmpty()) {
            $pendingRows = FamilyComment::query()
                ->select(['post_id', 'family_id', DB::raw('COUNT(*) as pending_count')])
                ->where('status', $pendingStatus)
                ->where(function (Builder $q) use ($rows) {
                    foreach ($rows as $row) {
                        $q->orWhere(function (Builder $inner) use ($row) {
                            $inner->where('post_id', $row->post_id)->where('family_id', $row->family_id);
                        });
                    }
                })
                ->groupBy('post_id', 'family_id')
                ->get();

            foreach ($pendingRows as $pendingRow) {
                $pendingByKey[$pendingRow->post_id.':'.$pendingRow->family_id] = (int) $pendingRow->pending_count;
            }
        }

        $items = $rows->map(function ($row) use ($posts, $families, $latestComments, $tab, $pendingByKey) {
            $post = $posts->get($row->post_id);
            $family = $families->get($row->family_id);
            $latest = $latestComments->get($row->latest_comment_id);
            $key = $row->post_id.':'.$row->family_id;

            $pendingCount = $tab === 'pending'
                ? (int) $row->matching_count
                : (int) ($pendingByKey[$key] ?? $row->pending_count ?? 0);

            return [
                'post_id' => (int) $row->post_id,
                'family_id' => (int) $row->family_id,
                'family_internal_name' => $family?->internal_name,
                'post_type' => $post?->type?->value ?? $post?->type,
                'post_preview' => $this->postPreview($post),
                'published_at' => $post?->published_at?->toIso8601String(),
                'matching_count' => (int) $row->matching_count,
                'pending_count' => $pendingCount,
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

        $comment->update([
            'status' => FamilyCommentStatus::Approved,
            'approved_at' => now(),
            'moderated_by' => $request->user()->id,
        ]);

        $this->stats->incrementApprovedComments((int) $comment->post_id, (int) $comment->family_id);
        $this->audit->log($request->user(), 'family.comment_approved', $comment);

        if ($comment->user) {
            $this->notifications->commentApproved($comment->user, (int) $comment->post_id);
        }

        return ApiResponse::success($this->present($comment->fresh(['user', 'family'])));
    }

    public function reject(Request $request, FamilyComment $comment): JsonResponse
    {
        $data = $request->validate([
            'reason' => ['required', Rule::enum(FamilyCommentRejectionReason::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $wasApproved = $comment->status === FamilyCommentStatus::Approved;

        $comment->update([
            'status' => FamilyCommentStatus::Rejected,
            'rejection_reason' => $data['reason'],
            'rejection_note' => $data['note'] ?? null,
            'rejected_at' => now(),
            'moderated_by' => $request->user()->id,
        ]);

        if ($wasApproved) {
            $this->stats->incrementApprovedComments((int) $comment->post_id, (int) $comment->family_id, -1);
        }

        $this->audit->log($request->user(), 'family.comment_rejected', $comment, ['reason' => $data['reason']]);

        if ($comment->user) {
            $reasonLabel = FamilyCommentRejectionReason::from($data['reason'])->label();
            $this->notifications->commentRejected($comment->user, $data['note'] ?? $reasonLabel);
        }

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
            $comment->update([
                'status' => FamilyCommentStatus::Approved,
                'approved_at' => now(),
                'moderated_by' => $request->user()->id,
            ]);
            $this->stats->incrementApprovedComments((int) $comment->post_id, (int) $comment->family_id);

            if ($comment->user) {
                $this->notifications->commentApproved($comment->user, (int) $comment->post_id);
            }
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

        return ApiResponse::success($this->present($comment->fresh(['user', 'family'])));
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

    private function applyTabFilter(Builder $query, string $tab): void
    {
        match ($tab) {
            'approved' => $query->where('status', FamilyCommentStatus::Approved->value),
            'rejected' => $query->where('status', FamilyCommentStatus::Rejected->value),
            'important' => $query->where('is_important', true),
            'unread' => $query->whereNull('seen_by_bahram_at'),
            'coaching_questions' => $query->whereJsonContains('ai_signals', 'coaching_question'),
            default => $query->where('status', FamilyCommentStatus::Pending->value),
        };
    }

    private function postPreview(?\App\Models\FamilyPost $post): ?string
    {
        if (! $post) {
            return null;
        }

        $textBlock = $post->blocks->first(
            fn ($block) => ($block->type === FamilyPostBlockType::Text || ($block->type?->value ?? $block->type) === 'text')
                && filled($block->text_content)
        );

        if ($textBlock) {
            return mb_substr(trim((string) $textBlock->text_content), 0, 160);
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function present(FamilyComment $comment): array
    {
        return [
            'id' => $comment->id,
            'body' => $comment->body,
            'status' => $comment->status?->value ?? $comment->status,
            'created_at' => $comment->created_at?->toIso8601String(),
            'is_important' => (bool) $comment->is_important,
            'in_pulse' => $comment->family_pulse_at !== null,
            'seen_by_bahram' => $comment->seen_by_bahram_at !== null,
            'user' => [
                'name' => $comment->user?->name,
            ],
            'family' => [
                'id' => $comment->family_id,
                'internal_name' => $comment->family?->internal_name,
            ],
            'post_id' => $comment->post_id,
            'family_id' => $comment->family_id,
            'ai' => [
                'risk_score' => $comment->ai_risk_score !== null ? (float) $comment->ai_risk_score : null,
                'sentiment' => $comment->ai_sentiment,
                'topic' => $comment->ai_topic,
                'signals' => $comment->ai_signals,
            ],
            'rejection_reason' => $comment->rejection_reason?->value,
            'rejection_note' => $comment->rejection_note,
        ];
    }
}
