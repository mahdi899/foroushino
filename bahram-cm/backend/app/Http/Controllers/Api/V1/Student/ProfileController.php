<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Http\Controllers\Controller;
use App\Http\Requests\Student\UpdateProfileRequest;
use App\Enums\OtpPurpose;
use App\Services\AdminTelegramLogService;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use App\Support\ApiResponse;
use App\Support\DirectoryListingGuard;
use App\Support\MediaUrl;
use App\Support\StudentProfilePayload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function __construct(private readonly OtpService $otp) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->loadMissing('profile');

        return ApiResponse::success($this->payload($user));
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();

        if (array_key_exists('name', $data) && filled($data['name'])) {
            $user->update(['name' => $data['name']]);
        }

        if (array_key_exists('password', $data) && filled($data['password'])) {
            if (filled($user->password)) {
                return ApiResponse::error(
                    'password_change_requires_otp',
                    'برای تغییر رمز عبور، ابتدا کد تأیید پیامکی را دریافت کنید.',
                    422,
                );
            }

            $user->update(['password' => Hash::make($data['password'])]);
        }

        $profileFields = array_intersect_key($data, array_flip([
            'email', 'age',
            'current_job', 'instagram', 'telegram', 'experience_level', 'income_goal', 'avatar',
        ]));

        if (array_key_exists('avatar', $profileFields) && filled($profileFields['avatar'])) {
            $profileFields['avatar'] = MediaUrl::reference((string) $profileFields['avatar']);
        }

        if (! empty($profileFields)) {
            $user->profile()->updateOrCreate(['user_id' => $user->id], $profileFields);
        }

        $user->refresh()->loadMissing('profile');

        app(AdminTelegramLogService::class)->notifyProfileUpdated($user);

        return ApiResponse::success($this->payload($user));
    }

    public function sendPasswordChangeOtp(Request $request): JsonResponse
    {
        $user = $request->user();

        if (blank($user->password)) {
            return ApiResponse::error('password_not_set', 'رمز عبور هنوز تنظیم نشده است.', 422);
        }

        try {
            $this->otp->send($user->mobile, OtpPurpose::ChangePassword, $request->ip(), $request->userAgent());
        } catch (OtpException $e) {
            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success([
            'mobile' => $user->mobile,
            'expires_in' => 120,
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        if (blank($user->password)) {
            return ApiResponse::error('password_not_set', 'رمز عبور هنوز تنظیم نشده است.', 422);
        }

        $data = $request->validate([
            'code' => ['required', 'string', 'size:5'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        try {
            $this->otp->verify($user->mobile, $data['code'], OtpPurpose::ChangePassword);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_invalid', $e->getMessage(), 422);
        }

        $user->update(['password' => Hash::make($data['password'])]);
        $user->refresh()->loadMissing('profile');

        app(AdminTelegramLogService::class)->notifyProfileUpdated($user);

        return ApiResponse::success($this->payload($user));
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        $data = $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $file = $data['avatar'];
        $directory = 'avatars/'.$user->id;
        $filename = 'avatar.'.$file->getClientOriginalExtension();
        $stored = $file->storeAs($directory, $filename, 'public');
        DirectoryListingGuard::guardPublicRelativePath($stored);

        $reference = MediaUrl::fromDiskPath($stored);
        $user->profile()->updateOrCreate(
            ['user_id' => $user->id],
            ['avatar' => $reference],
        );

        $user->refresh()->loadMissing('profile');

        app(AdminTelegramLogService::class)->notifyProfileUpdated($user);

        return ApiResponse::success($this->payload($user));
    }

    /** @return array<string, mixed> */
    private function payload($user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'mobile' => $user->mobile,
            'has_password' => filled($user->password),
            'profile' => StudentProfilePayload::fromUser($user),
        ];
    }
}
