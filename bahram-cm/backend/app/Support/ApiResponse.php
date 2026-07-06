<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;

/**
 * Standardized JSON envelope for the public API. Errors always follow the
 * shape { error: { code, message_fa, details? } } expected by the frontend.
 */
class ApiResponse
{
    public static function success(mixed $data = null, int $status = 200, array $meta = []): JsonResponse
    {
        $payload = ['data' => $data];

        if (! empty($meta)) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    public static function error(string $code, string $messageFa, int $status = 400, mixed $details = null): JsonResponse
    {
        $error = [
            'code' => $code,
            'message_fa' => $messageFa,
        ];

        if ($details !== null) {
            $error['details'] = $details;
        }

        return response()->json(['error' => $error], $status);
    }
}
