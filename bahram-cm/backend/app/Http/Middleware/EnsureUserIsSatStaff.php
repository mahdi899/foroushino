<?php

namespace App\Http\Middleware;

use App\Services\Sat\SatAccessService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsSatStaff
{
    public function __construct(private readonly SatAccessService $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $this->access->isSatStaff($user)) {
            return response()->json([
                'error' => [
                    'code' => 'forbidden',
                    'message_fa' => 'اجازه دسترسی به پنل سات ندارید.',
                ],
            ], 403);
        }

        if ($user->status?->value === 'blocked' || $user->status?->value === 'suspended') {
            return response()->json([
                'error' => [
                    'code' => 'account_blocked',
                    'message_fa' => 'حساب کاربری شما غیرفعال است.',
                ],
            ], 403);
        }

        return $next($request);
    }
}
