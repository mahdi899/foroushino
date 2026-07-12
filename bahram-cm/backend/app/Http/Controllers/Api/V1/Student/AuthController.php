<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\Student\LoginPasswordRequest;
use App\Http\Requests\Student\SendOtpRequest;
use App\Http\Requests\Student\VerifyOtpRequest;
use App\Models\User;
use App\Services\AdminTelegramLogService;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use App\Services\StudentOnboardingService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use App\Support\StudentAccess;
use App\Support\StudentProfilePayload;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private readonly OtpService $otp,
        private readonly StudentOnboardingService $onboarding,
    ) {}

    public function sendOtp(SendOtpRequest $request): \Illuminate\Http\JsonResponse
    {
        $mobile = Mobile::normalize($request->string('mobile'));

        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        if ($blocked = StudentAccess::blockedResponseForMobile($mobile)) {
            return $blocked;
        }

        if (User::query()->where('mobile', $mobile)->where('is_admin', true)->exists()) {
            return ApiResponse::error('forbidden', 'این شماره متعلق به یک حساب مدیریتی است.', 403);
        }

        if (User::query()->where('mobile', $mobile)->where('is_sat_staff', true)->exists()) {
            return ApiResponse::error('forbidden', 'این شماره متعلق به پرسنل سات است. از پنل سات وارد شوید.', 403);
        }

        try {
            $this->otp->send($mobile, OtpPurpose::Login, $request->ip(), $request->userAgent());
        } catch (OtpException $e) {
            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success(['mobile' => $mobile, 'expires_in' => 120]);
    }

    public function sendOtpViaBale(SendOtpRequest $request): \Illuminate\Http\JsonResponse
    {
        $mobile = Mobile::normalize($request->string('mobile'));

        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        if ($blocked = StudentAccess::blockedResponseForMobile($mobile)) {
            return $blocked;
        }

        if (User::query()->where('mobile', $mobile)->where('is_admin', true)->exists()) {
            return ApiResponse::error('forbidden', 'این شماره متعلق به یک حساب مدیریتی است.', 403);
        }

        if (User::query()->where('mobile', $mobile)->where('is_sat_staff', true)->exists()) {
            return ApiResponse::error('forbidden', 'این شماره متعلق به پرسنل سات است. از پنل سات وارد شوید.', 403);
        }

        try {
            $this->otp->sendViaBaleSafir($mobile, OtpPurpose::Login);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_bale_failed', $e->getMessage(), 429);
        }

        return ApiResponse::success([
            'mobile' => $mobile,
            'channel' => 'bale_safir',
            'message' => 'کد تأیید از طریق سفیر بله ارسال شد.',
        ]);
    }

    public function verifyOtp(VerifyOtpRequest $request): \Illuminate\Http\JsonResponse
    {
        $mobile = Mobile::normalize($request->string('mobile'));

        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        try {
            $this->otp->verify($mobile, $request->string('code'), OtpPurpose::Login);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_invalid', $e->getMessage(), 422);
        }

        $user = User::query()->firstOrCreate(
            ['mobile' => $mobile],
            ['name' => 'دانشجو', 'status' => 'active']
        );

        if ($user->wasRecentlyCreated) {
            app(AdminTelegramLogService::class)->notifyStudentRegistered($user);
        }

        if ($user->is_admin || $user->is_sat_staff) {
            return ApiResponse::error('forbidden', 'این شماره متعلق به حساب پرسنلی است.', 403);
        }

        if (StudentAccess::isBlocked($user)) {
            return StudentAccess::blockedResponse();
        }

        if ($user->mobile_verified_at === null) {
            $user->update(['mobile_verified_at' => now()]);
        }

        $user->update(['last_login_at' => now()]);

        $this->onboarding->handleFirstLogin($user);

        $token = $user->createToken('student-panel', ['student'], now()->addDays(30))->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function loginPassword(LoginPasswordRequest $request): \Illuminate\Http\JsonResponse
    {
        $mobile = Mobile::normalize($request->string('mobile'));

        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        $user = User::query()
            ->where('mobile', $mobile)
            ->where('is_admin', false)
            ->where('is_sat_staff', false)
            ->first();

        if ($user && StudentAccess::isBlocked($user)) {
            return StudentAccess::blockedResponse();
        }

        if (! $user || blank($user->password) || ! Hash::check($request->string('password'), $user->password)) {
            return ApiResponse::error('invalid_credentials', 'شماره موبایل یا رمز عبور نادرست است.', 422);
        }

        $user->update(['last_login_at' => now()]);
        $this->onboarding->handleFirstLogin($user);

        $token = $user->createToken('student-panel', ['student'], now()->addDays(30))->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): \Illuminate\Http\JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json(null, 204);
    }

    public function me(Request $request): \Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        return ApiResponse::success($this->userPayload($user));
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        $user->loadMissing(['profile', 'identityProfile', 'satMembership']);

        if (! $user->identityProfile) {
            app(\App\Actions\Identity\EnsureIdentityProfile::class)($user);
            $user->load('identityProfile');
        }

        $identity = $user->identityProfile;

        return [
            'id' => $user->id,
            'name' => $user->name,
            'mobile' => $user->mobile,
            'has_password' => filled($user->password),
            'first_login_at' => $user->first_login_at?->toIso8601String(),
            'profile' => StudentProfilePayload::fromUser($user),
            'verification_level' => (int) ($identity?->verification_level ?? 1),
            'identity_status' => $identity?->identity_status?->value ?? 'not_started',
            'mobile_ownership_status' => $identity?->mobile_ownership_status?->value ?? 'not_started',
            'sat_membership_status' => $user->satMembership?->status?->value ?? 'inactive',
            'national_code_masked' => $identity?->maskNationalCode(),
            'identity' => $identity ? [
                'first_name' => $identity->first_name,
                'last_name' => $identity->last_name,
                'city' => $identity->city,
                'date_of_birth' => $identity->date_of_birth?->toDateString(),
                'gender' => $identity->gender,
            ] : null,
        ];
    }
}
