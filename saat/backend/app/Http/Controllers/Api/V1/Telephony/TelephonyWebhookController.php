<?php

namespace App\Http\Controllers\Api\V1\Telephony;

use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Webhook entrypoint for future VoIP providers.
 * Events should populate `call_events`, `answered_at`, and `duration_source`.
 */
class TelephonyWebhookController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        // Provider-specific adapters will validate signatures and dispatch events here.
        return ApiResponse::success([
            'accepted' => true,
            'provider' => $request->string('provider')->toString() ?: 'unknown',
            'message' => 'Webhook endpoint reserved for future VoIP integration.',
        ]);
    }
}
