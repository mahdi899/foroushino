<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\StoreSatApplicationRequest;
use App\Services\AdminTelegramLogService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SatApplicationController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $application = $request->user()->satApplications()->latest('id')->first();

        if (! $application) {
            return ApiResponse::success(null);
        }

        return ApiResponse::success($this->payload($application));
    }

    public function store(StoreSatApplicationRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->satApplications()->exists()) {
            return ApiResponse::error('already_submitted', 'شما قبلاً درخواست سات ثبت کرده‌اید.', 422);
        }

        $application = $user->satApplications()->create([
            'name' => $request->string('name'),
            'mobile' => $user->mobile,
            'city' => $request->input('city'),
            'age' => $request->input('age'),
            'status' => 'received',
            'submitted_at' => now(),
        ]);

        app(AdminTelegramLogService::class)->notifySatApplicationSubmitted($application->loadMissing('user'));

        return ApiResponse::success($this->payload($application), 201);
    }

    /** @return array<string, mixed> */
    private function payload($application): array
    {
        return [
            'id' => $application->id,
            'name' => $application->name,
            'mobile' => $application->mobile,
            'city' => $application->city,
            'age' => $application->age,
            'status' => $application->status->value,
            'submitted_at' => $application->submitted_at?->toIso8601String(),
            'reviewed_at' => $application->reviewed_at?->toIso8601String(),
        ];
    }
}
