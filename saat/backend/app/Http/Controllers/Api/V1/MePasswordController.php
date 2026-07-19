<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Me\UpdatePasswordRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class MePasswordController extends Controller
{
    public function update(UpdatePasswordRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        if ($user->phone_otp_exempt) {
            $current = $request->string('current_password')->toString();
            if (! Hash::check($current, (string) $user->password)) {
                return ApiResponse::validationError([
                    'current_password' => ['رمز عبور فعلی نادرست است.'],
                ]);
            }
        }

        $user->update([
            'password' => $request->string('password')->toString(),
            'phone_otp_exempt' => true,
        ]);

        return ApiResponse::success(
            data: new UserResource($user->fresh()->load('team')),
            message: 'رمز عبور ذخیره شد. از این پس می‌توانی با شماره موبایل و رمز وارد شوی.',
        );
    }
}
