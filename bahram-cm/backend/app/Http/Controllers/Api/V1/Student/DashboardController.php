<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Services\StudentOnboardingService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __construct(private readonly StudentOnboardingService $onboarding) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return ApiResponse::success([
            'first_login_at' => $user->first_login_at?->toIso8601String(),
            'checklist' => $this->onboarding->checklist($user),
        ]);
    }

    public function markStep(Request $request, string $step): JsonResponse
    {
        $this->onboarding->markStepDone($request->user(), $step);

        return ApiResponse::success(['checklist' => $this->onboarding->checklist($request->user())]);
    }
}
