<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Cross-domain SSO handoff between rostami.app (main site/panel) and
 * rostami.club (Family PWA). Option B keeps these as two real, separate
 * apex domains, so the httpOnly `bahram_student_token` cookie set on one
 * host is never visible on the other — a plain redirect cannot carry it.
 *
 * Flow:
 *  1. Client is authenticated on domain A, hits `POST /student/auth/sso/bridge`
 *     (same-origin, cookie present) → mints a random one-time bridge token,
 *     valid for 60s, mapped to the user id in cache (Redis).
 *  2. Domain A's Next.js route redirects the browser to
 *     `https://{domain B}/sso/bridge?bt=<bridge_token>`.
 *  3. Domain B's Next.js route calls `POST /student/auth/sso/consume` with
 *     the bridge token (public, throttled, one-time use) → backend issues a
 *     FRESH Sanctum token for that user (same pattern as normal OTP login)
 *     and Domain B sets its own `bahram_student_token` cookie.
 *
 * The bridge token itself never grants API access — it only proves "this
 * browser held a valid session on the other domain within the last minute".
 */
class SsoBridgeController extends Controller
{
    private const TTL_SECONDS = 60;

    private const CACHE_PREFIX = 'sso_bridge:';

    public function issue(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        $token = Str::random(48);
        Cache::put(self::CACHE_PREFIX.$token, $user->id, self::TTL_SECONDS);

        return ApiResponse::success([
            'bridge_token' => $token,
            'expires_in' => self::TTL_SECONDS,
        ]);
    }

    public function consume(Request $request): \Illuminate\Http\JsonResponse
    {
        $bridgeToken = trim((string) $request->input('bridge_token'));

        if ($bridgeToken === '') {
            return ApiResponse::error('invalid_bridge_token', 'توکن نامعتبر است.', 422);
        }

        $cacheKey = self::CACHE_PREFIX.$bridgeToken;
        $userId = Cache::get($cacheKey);

        // One-time use — burn it immediately regardless of outcome.
        Cache::forget($cacheKey);

        if (! $userId) {
            return ApiResponse::error('bridge_expired', 'لینک ورود منقضی شده. دوباره تلاش کنید.', 410);
        }

        $user = User::find($userId);
        if (! $user || $user->is_admin || $user->is_sat_staff) {
            return ApiResponse::error('bridge_invalid_user', 'کاربر معتبر نیست.', 422);
        }

        if (\App\Support\StudentAccess::isBlocked($user)) {
            return \App\Support\StudentAccess::blockedResponse();
        }

        $token = $user->createToken('student-sso-bridge', ['student'], now()->addDays(30))->plainTextToken;

        return ApiResponse::success(['token' => $token]);
    }
}
