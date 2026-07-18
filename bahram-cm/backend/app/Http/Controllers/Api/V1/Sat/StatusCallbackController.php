<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Http\Controllers\Controller;
use App\Models\SatApplication;
use App\Support\ApiResponse;
use App\Support\HmacSigner;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Reverse channel: Saat (Server 2) reports a lead status change back to
 * Bahram (Server 1) for applications that were originally pushed out via
 * SatOutboundSyncService. Signed with the same HMAC scheme used outbound,
 * gated by proxy.origin + a SatIntegrationToken with the
 * `callback:lead-status` ability.
 */
class StatusCallbackController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bahram_application_id' => ['required', 'integer', 'min:1'],
            'status' => ['required', 'string', 'max:60'],
        ]);

        $timestamp = (string) $request->header((string) config('security.hmac.header_timestamp', 'X-Timestamp'));
        $nonce = (string) $request->header('X-Nonce');
        $signature = (string) $request->header((string) config('security.hmac.header_signature', 'X-Signature'));

        $verificationError = HmacSigner::verify($data, $timestamp, $nonce, $signature);

        if ($verificationError === null && ! HmacSigner::consumeNonce($nonce, $timestamp, 'sat-status-callback')) {
            $verificationError = 'replayed_request';
        }

        if ($verificationError !== null) {
            Log::warning('SAT status callback signature rejected', [
                'reason' => $verificationError,
                'bahram_application_id' => $data['bahram_application_id'],
            ]);

            return ApiResponse::error('invalid_signature', 'امضای درخواست نامعتبر است.', 401);
        }

        $application = SatApplication::query()->find($data['bahram_application_id']);

        if (! $application) {
            return ApiResponse::success(['acknowledged' => true, 'found' => false]);
        }

        $application->update([
            'sat_lead_status' => $data['status'],
            'sat_lead_status_synced_at' => now(),
        ]);

        return ApiResponse::success(['acknowledged' => true, 'found' => true]);
    }
}
