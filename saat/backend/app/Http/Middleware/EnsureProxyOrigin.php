<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks any request that does not carry both a Bearer token and the
 * configured `X-Proxy-Origin` header. Applied to the inbound integration
 * routes so traffic hitting sat.center directly (bypassing the trusted
 * server-to-server channel from Bahram) is dropped before the integration
 * token / HMAC signature is even evaluated.
 *
 * Modes:
 *  - "strict"   → Bearer token must exactly match config('security.proxy_origin.shared_token').
 *  - "presence" → Bearer token only needs to be present; its value is
 *                 validated afterwards by the route's own auth middleware
 *                 (integration.token).
 */
class EnsureProxyOrigin
{
    public function handle(Request $request, Closure $next, string $mode = 'presence'): Response
    {
        $config = config('security.proxy_origin');

        $headerName = (string) ($config['header'] ?? 'X-Proxy-Origin');
        $allowedValues = (array) ($config['allowed_values'] ?? []);
        $origin = (string) $request->header($headerName, '');

        if ($origin === '' || $allowedValues === [] || ! $this->matchesAny($origin, $allowedValues)) {
            return $this->deny();
        }

        $bearer = $request->bearerToken();
        if (! $bearer) {
            return $this->deny();
        }

        if ($mode === 'strict') {
            $expected = (string) ($config['shared_token'] ?? '');
            if ($expected === '' || ! hash_equals($expected, $bearer)) {
                return $this->deny();
            }
        }

        $request->attributes->set('proxy_origin', $origin);

        return $next($request);
    }

    private function matchesAny(string $origin, array $allowedValues): bool
    {
        foreach ($allowedValues as $allowed) {
            if (hash_equals((string) $allowed, $origin)) {
                return true;
            }
        }

        return false;
    }

    private function deny(): Response
    {
        return ApiResponse::error('دسترسی مستقیم به این مسیر مجاز نیست.', status: 403, code: 'proxy_origin_required');
    }
}
