<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\HmacSigner;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

/**
 * Verifies the HMAC signature Bahram (Server 1) attaches to every request
 * against the inbound integration routes, and rejects replays of an
 * already-consumed (nonce, timestamp) pair. Runs after `integration.token`
 * so an invalid Bearer token is rejected first with its own error code.
 */
class VerifyHmacSignature
{
    public function handle(Request $request, Closure $next, string $scope = 'sat-inbound'): Response
    {
        $payload = $request->isMethod('get') ? [] : (array) $request->all();

        $timestamp = (string) $request->header((string) config('security.hmac.header_timestamp', 'X-Timestamp'));
        $nonce = (string) $request->header('X-Nonce');
        $signature = (string) $request->header((string) config('security.hmac.header_signature', 'X-Signature'));

        $error = HmacSigner::verify($payload, $timestamp, $nonce, $signature);

        if ($error === null && ! HmacSigner::consumeNonce($nonce, $timestamp, $scope)) {
            $error = 'replayed_request';
        }

        if ($error !== null) {
            Log::warning('Inbound HMAC signature rejected', [
                'scope' => $scope,
                'reason' => $error,
                'path' => $request->path(),
            ]);

            return ApiResponse::error('امضای درخواست نامعتبر است.', status: 401, code: 'invalid_signature');
        }

        return $next($request);
    }
}
