<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Http\Controllers\Controller;
use App\Models\FamilyComment;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyNotificationService;
use App\Services\Family\FamilyStatsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
        $tab = $request->query('tab', 'pending');

        $query = FamilyComment::query()
            ->with(['user:id,name', 'family:id,internal_name', 'post:id,type']);

        match ($tab) {
            'approved' => $query->where('status', FamilyCommentStatus::Approved->value),
            'rejected' => $query->where('status', FamilyCommentStatus::Rejected->value),
            'important' => $query->where('is_important', true),
            'unread' => $query->whereNull('seen_by_bahram_at'),
            'coaching_questions' => $query->whereJsonContains('ai_signals', 'coaching_question'),
            default => $query->where('status', FamilyCommentStatus::Pending->value),
        };

        $comments = $query->orderByDesc('id')->paginate(min(50, (int) $request->query('per_page', 20)));

        $items = collect($comments->items())->map(fn (FamilyComment $c) => $this->present($c));

        return ApiResponse::success($items, 200, [
            'current_page' => $comments->currentPage(),
            'last_page' => $comments->lastPage(),
            'total' => $comments->total(),
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
            $this->notifications->commentApproved($comment->user);
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
                $this->notifications->commentApproved($comment->user);
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
        $comment->update([
            'is_important' => ! $comment->is_important,
            'featured_at' => ! $comment->is_important ? now() : null,
        ]);

        $this->audit->log($request->user(), 'family.comment_marked_important', $comment, [
            'is_important' => $comment->is_important,
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

        return ApiResponse::success($this->present($comment->fresh(['user', 'family'])));
    }

    public function markSeen(Request $request, FamilyComment $comment): JsonResponse
    {
        if (! $comment->seen_by_bahram_at) {
            $comment->update(['seen_by_bahram_at' => now()]);
        }

        return ApiResponse::success(['seen' => true]);
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
                'internal_name' => $comment->family?->internal_name,
            ],
            'post_id' => $comment->post_id,
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
