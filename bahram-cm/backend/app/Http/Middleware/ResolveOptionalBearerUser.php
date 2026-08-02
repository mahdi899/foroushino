<?php

namespace App\Http\Middleware;

use App\Models\PersonalAccessToken;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Optionally resolve a Sanctum student from Bearer token so route throttles
 * can key by user id before the controller runs.
 */
class ResolveOptionalBearerUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()) {
            return $next($request);
        }

        $token = $request->bearerToken();
        if (! $token) {
            return $next($request);
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        if ($user instanceof User && ! $user->is_admin) {
            $request->setUserResolver(static fn () => $user);
        }

        return $next($request);
    }
}
