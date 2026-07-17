<?php

namespace App\Modules\TelegramBot\Http\Controllers\Admin;

use App\Modules\TelegramBot\Services\HealthCheckService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelegramHealthAdminController
{
    public function __invoke(Request $request, HealthCheckService $health): JsonResponse
    {
        if (! $request->user()?->isSuperAdmin() && ! $request->user()?->hasPermission('telegram.view')) {
            abort(403);
        }

        return response()->json(['data' => $health->run()]);
    }
}
