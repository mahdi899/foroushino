<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards sensitive write endpoints (call result submit, sale confirm, payout request, ...)
 * against duplicate submission (double-tap, retried request after timeout, etc).
 *
 * Clients send an `Idempotency-Key` header; the first successful response for a given
 * key + route + user is cached and replayed verbatim on subsequent identical requests.
 */
class EnsureIdempotency
{
    private const TTL_SECONDS = 86400;

    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key) {
            return $next($request);
        }

        $cacheKey = $this->cacheKey($request, $key);

        $cached = Cache::get($cacheKey);
        if ($cached !== null) {
            return response()->json($cached['body'], $cached['status'])
                ->header('Idempotent-Replayed', 'true');
        }

        $lockKey = "{$cacheKey}:lock";
        $lock = Cache::lock($lockKey, 10);

        if (! $lock->get()) {
            return response()->json([
                'success' => false,
                'message' => 'درخواست مشابه در حال پردازش است، لطفاً کمی صبر کنید.',
                'data' => null,
            ], 409);
        }

        try {
            /** @var Response $response */
            $response = $next($request);

            if ($response->getStatusCode() < 500) {
                Cache::put($cacheKey, [
                    'status' => $response->getStatusCode(),
                    'body' => json_decode($response->getContent(), true),
                ], self::TTL_SECONDS);
            }

            return $response;
        } finally {
            $lock->release();
        }
    }

    private function cacheKey(Request $request, string $key): string
    {
        $userId = $request->user()?->id ?? 'guest';

        return "idempotency:{$userId}:{$request->method()}:{$request->path()}:{$key}";
    }
}
