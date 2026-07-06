<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Http\Controllers\Controller;
use App\Http\Resources\V1\ActivityLogResource;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->activityLogs()->orderByDesc('created_at');

        if ($request->filled('kind')) {
            $query->where('kind', $request->string('kind'));
        }

        return ApiResponse::success(ActivityLogResource::collection($query->limit(200)->get()));
    }
}
