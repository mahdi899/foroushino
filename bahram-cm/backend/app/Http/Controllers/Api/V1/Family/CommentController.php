<?php

namespace App\Http\Controllers\Api\V1\Family;

use App\Enums\Family\FamilyCommentStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\V1\Family\FamilyCommentResource;
use App\Jobs\Family\AnalyzeFamilyCommentJob;
use App\Models\FamilyComment;
use App\Models\FamilyPost;
use App\Services\Family\FamilyAccessService;
use App\Services\Family\FamilyAiSettingsService;
use App\Services\Family\FamilyStatsService;
use App\Services\Family\PostAudienceResolver;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct(
        private readonly FamilyAccessService $access,
        private readonly PostAudienceResolver $audience,
        private readonly FamilyStatsService $stats,
    ) {}

    public function index(Request $request, FamilyPost $post): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        abort_unless($this->audience->visibleToFamily($post, (int) $membership->family_id), 404);

        $familyId = (int) $membership->family_id;
        $userId = (int) $request->user()->id;
        $limit = min(50, max(1, $request->integer('limit', 20)));

        $query = FamilyComment::query()
            ->where('post_id', $post->id)
            ->where('family_id', $familyId)
            ->where(function ($q) use ($userId) {
                $q->where('status', FamilyCommentStatus::Approved->value)
                    ->orWhere(function ($mine) use ($userId) {
                        $mine->where('user_id', $userId)
                            ->whereIn('status', [
                                FamilyCommentStatus::Pending->value,
                                FamilyCommentStatus::Rejected->value,
                            ]);
                    });
            })
            ->with(['user:id,name', 'user.profile'])
            ->orderByDesc('id');

        if ($cursor = $request->query('cursor')) {
            $query->where('id', '<', (int) $cursor);
        }

        $comments = $query->limit($limit + 1)->get();
        $hasMore = $comments->count() > $limit;
        if ($hasMore) {
            $comments = $comments->take($limit)->values();
        }

        return ApiResponse::success(
            FamilyCommentResource::collection($comments)->resolve(),
            200,
            ['next_cursor' => $hasMore ? (string) $comments->last()->id : null]
        );
    }

    public function store(Request $request, FamilyPost $post): JsonResponse
    {
        $membership = $this->access->requireMembership($request->user());
        abort_unless($this->audience->visibleToFamily($post, (int) $membership->family_id), 404);
        abort_if($post->comments_enabled === false, 422, 'نظرات این پست بسته است.');

        $max = (int) config('family.comment.max_length', 1000);
        $data = $request->validate([
            'body' => ['required', 'string', 'min:2', "max:{$max}"],
        ]);

        $aiSettings = app(FamilyAiSettingsService::class);
        $requireApproval = (bool) config('family.comment.require_approval', false)
            || ($aiSettings->isActive() && $aiSettings->autoApproveComments());
        $status = $requireApproval ? FamilyCommentStatus::Pending : FamilyCommentStatus::Approved;

        $comment = FamilyComment::query()->create([
            'post_id' => $post->id,
            'family_id' => $membership->family_id,
            'user_id' => $request->user()->id,
            'body' => trim($data['body']),
            'status' => $status,
            'approved_at' => $requireApproval ? null : now(),
        ]);

        if (! $requireApproval) {
            $this->stats->incrementApprovedComments((int) $post->id, (int) $membership->family_id);
        }

        $comment->load(['user:id,name', 'user.profile']);

        AnalyzeFamilyCommentJob::dispatch($comment->id)
            ->onQueue(config('family.queues.ai', 'family-ai'));

        return ApiResponse::success(
            (new FamilyCommentResource($comment))->resolve(),
            201
        );
    }
}
