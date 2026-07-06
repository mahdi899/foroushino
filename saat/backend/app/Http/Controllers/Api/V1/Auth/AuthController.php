<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\Availability;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Auth\DevLoginRequest;
use App\Http\Requests\V1\Auth\TelegramLoginRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Auth\InvalidTelegramInitDataException;
use App\Services\Auth\TelegramAuthVerifier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function __construct(private readonly TelegramAuthVerifier $telegramAuthVerifier) {}

    public function telegram(TelegramLoginRequest $request): JsonResponse
    {
        try {
            $telegramUser = $this->telegramAuthVerifier->verify($request->string('init_data')->toString());
        } catch (InvalidTelegramInitDataException $e) {
            return ApiResponse::error($e->getMessage(), status: 401, code: 'invalid_telegram_data');
        }

        $user = User::query()->firstOrNew(['telegram_id' => $telegramUser['id']]);

        if (! $user->exists) {
            $user->fill([
                'name' => trim("{$telegramUser['first_name']} {$telegramUser['last_name']}"),
                'email' => 'tg_'.$telegramUser['id'].'@telegram.saat.local',
                'password' => Hash::make(Str::random(40)),
                'avatar' => $telegramUser['photo_url'],
                'availability' => Availability::Offline,
            ]);
            $user->save();
            $user->assignRole(RoleName::Agent->value);
            Wallet::query()->firstOrCreate(['user_id' => $user->id]);
        }

        if (! $user->is_active) {
            return ApiResponse::error('حساب کاربری شما غیرفعال شده است.', status: 403, code: 'account_disabled');
        }

        $token = $user->createToken('telegram-webapp')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => new UserResource($user->load('team')),
        ], 'ورود موفق');
    }

    public function devLogin(DevLoginRequest $request): JsonResponse
    {
        $query = User::query();

        if ($request->filled('email')) {
            $query->where('email', $request->string('email'));
        } elseif ($request->filled('role')) {
            $query->role($request->string('role')->toString());
        } else {
            $query->role(RoleName::Agent->value);
        }

        $user = $query->first();

        if (! $user) {
            return ApiResponse::error('کاربری با این مشخصات برای ورود آزمایشی یافت نشد.', status: 404, code: 'dev_user_not_found');
        }

        $token = $user->createToken('dev-login')->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => new UserResource($user->load('team')),
        ], 'ورود آزمایشی موفق');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return ApiResponse::success(message: 'خروج موفق');
    }
}
