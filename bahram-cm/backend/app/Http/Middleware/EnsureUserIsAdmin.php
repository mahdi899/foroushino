<?php

namespace App\Http\Middleware;

use App\Enums\UserStatus;
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

        if ($user->status === UserStatus::Suspended) {
            return response()->json([
                'error' => [
                    'code' => 'account_suspended',
                    'message_fa' => 'حساب مدیر معلق شده است.',
                ],
            ], 403);
        }

        if ($user->status === UserStatus::Blocked) {
            return response()->json([
                'error' => [
                    'code' => 'account_blocked',
                    'message_fa' => 'حساب مدیر مسدود شده است.',
                ],
            ], 403);
        }

        return $next($request);
    }
}
