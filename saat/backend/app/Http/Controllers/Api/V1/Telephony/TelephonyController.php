<?php

namespace App\Http\Controllers\Api\V1\Telephony;

use App\Http\Controllers\Controller;
use App\Services\Telephony\CallOrchestrator;
use App\Services\Telephony\VoipAdapter;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TelephonyController extends Controller
{
    public function capabilities(CallOrchestrator $orchestrator): JsonResponse
    {
        return ApiResponse::success($orchestrator->capabilities());
    }

    public function health(VoipAdapter $voip): JsonResponse
    {
        return ApiResponse::success([
            'voip_healthy' => $voip->healthCheck(),
            'checked_at' => now()->toIso8601String(),
        ]);
    }

    public function testConnection(Request $request, VoipAdapter $voip): JsonResponse
    {
        abort_unless($request->user()?->can('admin.settings'), 403);

        $healthy = $voip->healthCheck();

        return ApiResponse::success([
            'ok' => $healthy,
            'message' => $healthy ? 'اتصال VoIP برقرار است.' : 'اتصال VoIP برقرار نیست.',
        ]);
    }
}
