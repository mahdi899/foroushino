<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\CourseAccessStatus;
use App\Http\Controllers\Controller;
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
            ] : null,
            'status' => $access->status->value,
            'access_type' => $access->access_type,
            'activated_at' => $access->activated_at?->toIso8601String(),
            'is_active' => $access->status === CourseAccessStatus::Active,
            'spotplayer' => $access->spotplayerLicense ? [
                'status' => $access->spotplayerLicense->status->value,
                // license_url is a SpotPlayer-hosted, licensed player link — never a raw downloadable file.
                'license_url' => $access->spotplayerLicense->license_url,
            ] : null,
        ]));
    }
}
