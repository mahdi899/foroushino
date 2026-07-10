<?php

namespace App\Support;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class StudentAccess
{
    public const BLOCKED_MESSAGE = 'حساب کاربری شما مسدود شده است. لطفاً با پشتیبانی تماس بگیرید.';

    public static function isBlocked(?User $user): bool
    {
        return $user !== null
            && ! $user->is_admin
            && $user->status === UserStatus::Blocked;
    }

    public static function blockedResponse(): JsonResponse
    {
        return ApiResponse::error('account_blocked', self::BLOCKED_MESSAGE, 403);
    }

    public static function findStudentByMobile(string $mobile): ?User
    {
        return User::query()
            ->where('mobile', $mobile)
            ->where('is_admin', false)
            ->first();
    }

    public static function blockedResponseForMobile(string $mobile): ?JsonResponse
    {
        $user = self::findStudentByMobile($mobile);

        return self::isBlocked($user) ? self::blockedResponse() : null;
    }

    public static function revokeTokens(User $user): void
    {
        $user->tokens()->delete();
    }
}
