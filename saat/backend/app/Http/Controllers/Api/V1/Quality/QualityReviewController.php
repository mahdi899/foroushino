<?php

namespace App\Http\Controllers\Api\V1\Quality;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Models\CoachingTask;
use App\Models\QualityReview;
use App\Support\ApiResponse;
use App\Support\TeamScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QualityReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user->hasAnyRole([
                RoleName::Supervisor->value,
                RoleName::Manager->value,
                RoleName::Admin->value,
            ]),
            403,
        );

        $query = QualityReview::query()->with(['call.lead', 'agent'])->latest();

        if (! TeamScope::isOrgWide($user) && $user->team_id) {
            $query->whereHas('agent', fn ($q) => $q->where('team_id', $user->team_id));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return ApiResponse::success($query->limit(100)->get());
    }

    public function update(Request $request, QualityReview $qualityReview): JsonResponse
    {
        abort_unless($request->user()?->hasAnyRole([
            RoleName::Supervisor->value,
            RoleName::Manager->value,
            RoleName::Admin->value,
        ]), 403);

        $validated = $request->validate([
            'score' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'criteria_scores' => ['sometimes', 'array'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'status' => ['sometimes', 'string', 'in:pending,reviewed,disputed'],
            'dispute_reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $qualityReview->fill($validated);
        if (($validated['status'] ?? null) === 'reviewed') {
            $qualityReview->reviewer_id = $request->user()->id;
            $qualityReview->reviewed_at = now();
        }
        $qualityReview->save();

        return ApiResponse::success($qualityReview->fresh(), 'بررسی کیفیت ذخیره شد');
    }

    public function coachingTasks(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = CoachingTask::query()->with(['agent', 'coach'])->latest();

        if ($user->hasRole(RoleName::Agent->value)) {
            $query->where('agent_id', $user->id);
        } elseif (! TeamScope::isOrgWide($user) && $user->team_id) {
            $query->whereHas('agent', fn ($q) => $q->where('team_id', $user->team_id));
        }

        return ApiResponse::success($query->limit(100)->get());
    }

    public function storeCoachingTask(Request $request): JsonResponse
    {
        abort_unless($request->user()?->hasAnyRole([
            RoleName::Supervisor->value,
            RoleName::Manager->value,
            RoleName::Admin->value,
        ]), 403);

        $validated = $request->validate([
            'agent_id' => ['required', 'integer', 'exists:users,id'],
            'quality_review_id' => ['nullable', 'integer', 'exists:quality_reviews,id'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:5000'],
            'due_at' => ['nullable', 'date'],
        ]);

        $task = CoachingTask::query()->create([
            ...$validated,
            'coach_id' => $request->user()->id,
            'status' => 'open',
        ]);

        return ApiResponse::success($task, 'وظیفه کوچینگ ایجاد شد', 201);
    }

    public function updateCoachingTask(Request $request, CoachingTask $coachingTask): JsonResponse
    {
        $user = $request->user();
        abort_unless(
            $user?->hasAnyRole([
                RoleName::Supervisor->value,
                RoleName::Manager->value,
                RoleName::Admin->value,
            ]) || $coachingTask->agent_id === $user?->id,
            403,
        );

        $validated = $request->validate([
            'status' => ['sometimes', 'string', 'in:open,completed,cancelled'],
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'due_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $coachingTask->fill($validated);
        if (($validated['status'] ?? null) === 'completed') {
            $coachingTask->completed_at = now();
        }
        $coachingTask->save();

        return ApiResponse::success($coachingTask->fresh(), 'وظیفه کوچینگ به‌روزرسانی شد');
    }
}
