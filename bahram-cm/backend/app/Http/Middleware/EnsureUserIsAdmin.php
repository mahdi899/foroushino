<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Guards admin-only API routes. Required because student accounts (mobile +
 * OTP) now also authenticate via Sanctum bearer tokens, so `auth:sanctum`
 * alone is no longer sufficient to assume "authenticated = admin".
 */
class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_admin) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'اجازه دسترسی ندارید.',
                ],
            ], 403);
        }

        return $next($request);
    }
}
