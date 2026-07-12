<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ReferralService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class ReferralCodeController extends Controller
{
    public function __construct(private readonly ReferralService $referrals) {}

    public function validateCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:20'],
        ]);

        $normalized = $this->referrals->validateForOrder($data['code'], $this->optionalStudent($request));

        return response()->json([
            'data' => [
                'code' => $normalized,
            ],
        ]);
    }

    private function optionalStudent(Request $request): ?User
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        $user = $accessToken?->tokenable;

        if (! $user instanceof User || $user->is_admin) {
            return null;
        }

        return $user;
    }
}
