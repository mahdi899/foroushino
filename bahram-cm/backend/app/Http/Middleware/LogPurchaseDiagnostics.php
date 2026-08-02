<?php

namespace App\Http\Middleware;

use App\Support\PurchaseRateLimit;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Local/testing-only purchase diagnostics. Never logs secrets or raw mobiles.
 */
class LogPurchaseDiagnostics
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! app()->environment(['local', 'testing'])) {
            return $next($request);
        }

        $requestId = (string) ($request->headers->get('X-Request-Id') ?: Str::uuid());
        $request->headers->set('X-Request-Id', $requestId);
        $started = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $xff = (string) $request->headers->get('X-Forwarded-For', '');
        $xffMasked = $xff !== '' ? self::maskIp(trim(explode(',', $xff)[0])) : null;

        Log::debug('purchase.diagnostics', [
            'request_id' => $requestId,
            'route' => $request->path(),
            'client_ip' => $request->ip(),
            'forwarded_for_masked' => $xffMasked,
            'user_id' => $request->user()?->getAuthIdentifier(),
            'purchase_identifier' => PurchaseRateLimit::identifier($request),
            'status' => $response->getStatusCode(),
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
        ]);

        $response->headers->set('X-Request-Id', $requestId);

        return $response;
    }

    private static function maskIp(string $ip): string
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $parts = explode('.', $ip);

            return $parts[0].'.'.$parts[1].'.x.x';
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            return substr($ip, 0, 12).'…';
        }

        return 'invalid';
    }
}
