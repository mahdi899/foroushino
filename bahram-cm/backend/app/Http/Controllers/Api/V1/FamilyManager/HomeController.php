<?php

namespace App\Http\Controllers\Api\V1\FamilyManager;

use App\Enums\Family\FamilyCommentStatus;
use App\Http\Controllers\Controller;
use App\Models\FamilyActionResponse;
use App\Models\FamilyComment;
use App\Models\FamilyPost;
use App\Models\FamilyReaction;
use App\Services\Family\FamilyIntelligenceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeController extends Controller
{
    public function __construct(
        private readonly FamilyIntelligenceService $intelligence,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $today = now()->startOfDay();

        $postsToday = FamilyPost::query()
            ->where('status', 'published')
            ->where('published_at', '>=', $today)
            ->count();

        $reactionsToday = FamilyReaction::query()
            ->where('created_at', '>=', $today)
            ->count();

        $newCommentsToday = FamilyComment::query()
            ->where('created_at', '>=', $today)
            ->count();

        $pendingComments = FamilyComment::query()
            ->where('status', FamilyCommentStatus::Pending->value)
            ->count();

        $actionsCompletedToday = FamilyActionResponse::query()
            ->where('created_at', '>=', $today)
            ->count();

        $topicCounts = FamilyComment::query()
            ->where('created_at', '>=', now()->subDays(1))
            ->whereNotNull('ai_topic')
            ->where('ai_topic', '!=', '')
            ->selectRaw('ai_topic, COUNT(*) as c')
            ->groupBy('ai_topic')
            ->pluck('c', 'ai_topic')
            ->all();

        $sampleSize = FamilyComment::query()->where('created_at', '>=', now()->subDays(1))->count();

        return ApiResponse::success([
            'posts_today' => $postsToday,
            'reactions_today' => $reactionsToday,
            'new_comments_today' => $newCommentsToday,
            'pending_comments' => $pendingComments,
            'actions_completed_today' => $actionsCompletedToday,
            'ai_summary' => $this->intelligence->summarizeDaily($sampleSize, $topicCounts),
        ]);
    }
}
