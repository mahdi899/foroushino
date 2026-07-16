<?php

namespace App\Modules\TelegramBot\Http\Controllers;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Services\LoginTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IdentityStatusController
{
    public function __construct(
        private readonly LoginTokenService $loginTokens,
    ) {}

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user === null) {
            return response()->json([
                'error' => [
                    'code' => 'unauthenticated',
                    'message_fa' => 'برای مشاهده وضعیت باید وارد شوید.',
                ],
            ], 401);
        }

        $account = TelegramAccount::query()
            ->where('user_id', $user->id)
            ->first();

        return response()->json([
            'data' => [
                'linked' => $account !== null,
                'telegram_username' => $account?->telegram_username,
                'display_name' => $account?->display_name,
                'mobile_verified' => $account?->hasVerifiedMobile() ?? false,
            ],
        ]);
    }

    public function session(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'login_token' => ['required', 'string'],
        ]);

        $token = $this->loginTokens->consume($validated['login_token']);

        if ($token === null) {
            return response()->json([
                'error' => [
                    'code' => 'invalid_token',
                    'message_fa' => 'توکن ورود نامعتبر یا منقضی شده است.',
                ],
            ], 422);
        }

        $account = $token->account;
        $user = $token->user ?? $account?->user;

        if ($user === null) {
            return response()->json([
                'error' => [
                    'code' => 'account_not_linked',
                    'message_fa' => 'حساب تلگرام هنوز به کاربر سایت متصل نشده است.',
                ],
            ], 422);
        }

        $sanctumToken = $user->createToken('telegram-miniapp')->plainTextToken;

        return response()->json([
            'data' => [
                'token' => $sanctumToken,
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'mobile' => $user->mobile,
                ],
            ],
        ]);
    }
}
