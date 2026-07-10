<?php

namespace App\Http\Middleware;

use App\Support\StudentAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStudentIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && StudentAccess::isBlocked($user)) {
            $token = $user->currentAccessToken();
            if ($token && method_exists($token, 'delete')) {
                $token->delete();
            }

            return StudentAccess::blockedResponse();
        }

        return $next($request);
    }
}
