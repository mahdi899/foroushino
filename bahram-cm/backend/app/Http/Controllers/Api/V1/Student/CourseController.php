<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\CourseAccessStatus;
use App\Http\Controllers\Controller;
use App\Models\CourseAccess;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $accesses = $request->user()->courseAccesses()
            ->with(['product', 'spotplayerLicense'])
            ->orderByDesc('id')
            ->get();

        return ApiResponse::success($accesses->map(fn ($access) => [
            'id' => $access->id,
            'product' => $access->product ? [
                'id' => $access->product->id,
                'title' => $access->product->title,
                'slug' => $access->product->slug,
                'featured_image' => $access->product->featured_image,
                'spotplayer_course_id' => $access->product->spotplayer_course_id,
            ] : null,
            'status' => $access->status->value,
            'access_type' => $access->access_type,
            'activated_at' => $access->activated_at?->toIso8601String(),
            'is_active' => $access->status === CourseAccessStatus::Active,
            'spotplayer' => $access->spotplayerLicense ? [
                'status' => $access->spotplayerLicense->status->value,
                'license_url' => $access->spotplayerLicense->license_url,
                'spotplayer_course_id' => $access->spotplayerLicense->spotplayer_course_id,
            ] : null,
        ]));
    }

    public function player(Request $request, CourseAccess $courseAccess): JsonResponse
    {
        abort_unless($courseAccess->user_id === $request->user()->id, 404);

        $courseAccess->load(['product', 'spotplayerLicense']);
        $license = $courseAccess->spotplayerLicense;

        if (! $courseAccess->isActive() || ! $license) {
            return ApiResponse::success([
                'available' => false,
                'message' => 'دسترسی پخش برای این دوره فعال نیست.',
            ]);
        }

        $licenseUrl = $license->license_url;
        $scriptUrl = $licenseUrl ? $this->licenseScriptUrl($licenseUrl) : null;

        return ApiResponse::success([
            'available' => true,
            'course_access_id' => $courseAccess->id,
            'product_title' => $courseAccess->product?->title,
            'license_key' => $license->license_key,
            'spotplayer_course_id' => $license->spotplayer_course_id ?: $courseAccess->product?->spotplayer_course_id,
            'license_script_url' => $scriptUrl,
        ]);
    }

    private function licenseScriptUrl(string $licenseUrl): string
    {
        $parts = parse_url($licenseUrl);
        $scheme = $parts['scheme'] ?? 'https';
        $host = $parts['host'] ?? 'dl.spotplayer.ir';
        $path = $parts['path'] ?? $licenseUrl;

        return "{$scheme}://{$host}{$path}?f=js";
    }
}
