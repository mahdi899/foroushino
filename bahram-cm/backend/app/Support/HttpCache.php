<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;

/**
 * HTTP caching helpers — ETag / 304 and Cache-Control for JSON APIs.
 */
final class HttpCache
{
    public static function etag(string ...$parts): string
    {
        return '"'.implode('-', array_map(static fn ($part) => (string) $part, $parts)).'"';
    }

    public static function matches(Request $request, string $etag): bool
    {
        $header = $request->header('If-None-Match');
        if (! is_string($header) || $header === '') {
            return false;
        }

        foreach (explode(',', $header) as $candidate) {
            $candidate = trim($candidate);
            if ($candidate === '*' || $candidate === $etag) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    public static function conditionalJson(
        Request $request,
        mixed $data,
        string $etag,
        string $cacheControl,
        int $status = 200,
        array $meta = [],
    ): JsonResponse|Response {
        if (self::matches($request, $etag)) {
            return response('', 304)
                ->header('ETag', $etag)
                ->header('Cache-Control', $cacheControl);
        }

        return ApiResponse::success($data, $status, $meta)
            ->header('ETag', $etag)
            ->header('Cache-Control', $cacheControl);
    }

    public static function publicMaxAge(int $maxAge, ?int $staleWhileRevalidate = null): string
    {
        $swr = $staleWhileRevalidate ?? $maxAge * 2;

        return "public, max-age={$maxAge}, stale-while-revalidate={$swr}";
    }

    public static function privateMaxAge(int $maxAge, bool $mustRevalidate = true): string
    {
        $directive = "private, max-age={$maxAge}";

        return $mustRevalidate ? "{$directive}, must-revalidate" : $directive;
    }

    /**
     * Attach public Cache-Control to a JsonResource / collection / response.
     */
    public static function withPublicCache(mixed $response, int $maxAge = 300, ?int $staleWhileRevalidate = null): JsonResponse
    {
        if ($response instanceof JsonResource || $response instanceof ResourceCollection) {
            $response = $response->response();
        }

        if (! $response instanceof JsonResponse) {
            $response = response()->json($response);
        }

        return $response->header('Cache-Control', self::publicMaxAge($maxAge, $staleWhileRevalidate));
    }
}
