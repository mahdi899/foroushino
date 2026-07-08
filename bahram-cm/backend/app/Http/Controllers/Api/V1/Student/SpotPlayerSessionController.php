<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Persists the SpotPlayer browser cookie (X) per student so it can be restored
 * after logout/login on the same account. Logout does not clear this value.
 */
class SpotPlayerSessionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return ApiResponse::success([
            'x' => $request->user()->spotplayer_x,
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'x' => ['required', 'string', 'min:36', 'max:128', 'regex:/^[a-f0-9]+$/i'],
        ]);

        $request->user()->update(['spotplayer_x' => $data['x']]);

        return ApiResponse::success(['x' => $data['x']]);
    }
}
