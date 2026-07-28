<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class OptionalStudent
{
    public static function from(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        if (! $user instanceof User) {
            return null;
        }

        // SAT staff use their own panel. Admins may hold a student-scoped
        // token (same mobile on /panel) and still need ownership/pricing.
        if ($user->is_sat_staff) {
            return null;
        }

        return $user;
    }
}
