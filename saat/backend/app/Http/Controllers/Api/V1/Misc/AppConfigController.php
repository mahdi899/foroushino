<?php

namespace App\Http\Controllers\Api\V1\Misc;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class AppConfigController extends Controller
{
    /** Runtime settings exposed to all authenticated app users. */
    public function __invoke(): JsonResponse
    {
        $settings = AppSetting::allKeyed();

        return ApiResponse::success([
            'min_call_duration_sec' => (int) ($settings['min_call_duration_sec'] ?? 0),
            'call_lock_minutes' => (int) ($settings['call_lock_minutes'] ?? 30),
        ]);
    }
}
