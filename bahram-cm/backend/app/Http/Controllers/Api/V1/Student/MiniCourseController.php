<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\MiniCourse;
use App\Models\MiniCourseEnrollment;
use App\Services\MiniCourseEnrollmentService;
use App\Support\ApiResponse;
use App\Support\MediaUrl;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MiniCourseController extends Controller
{
    public function show(Request $request, string $slug): JsonResponse
    {
        $course = MiniCourse::query()->active()->where('slug', $slug)->firstOrFail();
        $enrollment = MiniCourseEnrollment::query()
            ->with('order')
            ->where('user_id', $request->user()->id)
            ->where('mini_course_id', $course->id)
            ->first();

        return ApiResponse::success([
            'slug' => $course->slug,
            'title' => $course->title,
            'enrolled' => (bool) $enrollment,
            'enrollment_number' => $enrollment?->enrollment_number,
            'order_number' => $enrollment?->order?->order_number ?? $enrollment?->enrollment_number,
            'enrolled_at' => $enrollment?->enrolled_at?->toIso8601String(),
        ]);
    }

    public function enroll(Request $request, string $slug, MiniCourseEnrollmentService $enrollments): JsonResponse
    {
        $course = MiniCourse::query()->active()->where('slug', $slug)->firstOrFail();
        $enrollment = $enrollments->enroll($request->user(), $course)->load('order');

        return ApiResponse::success([
            'enrollment_id' => $enrollment->id,
            'order_id' => $enrollment->order_id,
            'enrollment_number' => $enrollment->enrollment_number,
            'order_number' => $enrollment->order?->order_number ?? $enrollment->enrollment_number,
            'enrolled_at' => $enrollment->enrolled_at?->toIso8601String(),
            'slug' => $course->slug,
            'title' => $course->title,
            'already_enrolled' => ! $enrollment->wasRecentlyCreated,
        ]);
    }

    public function player(Request $request, string $slug): JsonResponse
    {
        $user = $request->user();
        $course = MiniCourse::query()->active()->where('slug', $slug)->firstOrFail();

        $enrollment = MiniCourseEnrollment::query()
            ->where('user_id', $user->id)
            ->where('mini_course_id', $course->id)
            ->first();

        if (! $enrollment) {
            return ApiResponse::error('not_enrolled', 'ابتدا باید در این مینی‌دوره ثبت‌نام کنید.', 404);
        }

        $thumbnail = $course->thumbnail
            ? MediaUrl::resolve($course->thumbnail, absolute: false)
            : null;

        return ApiResponse::success([
            'available' => true,
            'enrollment_id' => $enrollment->id,
            'enrollment_number' => $enrollment->enrollment_number,
            'slug' => $course->slug,
            'title' => $course->title,
            'subtitle' => $course->subtitle,
            'description' => $course->description,
            'thumbnail' => $thumbnail,
            'aparat_hash' => $course->aparat_hash,
            'enrolled_at' => $enrollment->enrolled_at?->toIso8601String(),
        ]);
    }
}
