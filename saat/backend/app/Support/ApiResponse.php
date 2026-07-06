<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    public static function success(
        mixed $data = null,
        string $message = 'OK',
        int $status = 200,
        array $meta = [],
    ): JsonResponse {
        $payload = [
            'success' => true,
            'message' => $message,
            'data' => $data,
        ];

        if ($meta !== []) {
            $payload['meta'] = $meta;
        }

        return response()->json($payload, $status);
    }

    /**
     * Paginated response: unwraps a LengthAwarePaginator (or resource collection wrapping one)
     * into `data` + a `meta.pagination` block.
     */
    public static function paginated(
        LengthAwarePaginator|AbstractPaginator|AnonymousResourceCollection $paginator,
        string $message = 'OK',
    ): JsonResponse {
        $resource = $paginator instanceof AnonymousResourceCollection ? $paginator->resource : $paginator;

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginator instanceof AnonymousResourceCollection ? $paginator : $resource->items(),
            'meta' => [
                'pagination' => [
                    'current_page' => $resource->currentPage(),
                    'per_page' => $resource->perPage(),
                    'total' => $resource->total(),
                    'last_page' => $resource->lastPage(),
                ],
            ],
        ], 200);
    }

    public static function error(
        string $message = 'Error',
        mixed $data = null,
        int $status = 400,
        ?string $code = null,
    ): JsonResponse {
        $payload = [
            'success' => false,
            'message' => $message,
            'data' => $data,
        ];

        if ($code !== null) {
            $payload['code'] = $code;
        }

        return response()->json($payload, $status);
    }

    public static function validationError(array $errors, string $message = 'اطلاعات ارسالی نامعتبر است.'): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
        ], 422);
    }
}
