<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** API responses must never be cached by browser or CDN edge. */
final class PreventApiCaching
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        $response->headers->set('Pragma', 'no-cache');
        $response->headers->set('Expires', '0');
        $response->headers->set('CDN-Cache-Control', 'no-store');

        return $response;
    }
}
