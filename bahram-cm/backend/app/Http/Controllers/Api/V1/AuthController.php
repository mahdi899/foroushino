<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\AdminSendOtpRequest;
use App\Http\Requests\V1\AdminVerifyOtpRequest;
use App\Http\Requests\V1\LoginRequest;
use App\Models\User;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const ADMIN_LOGIN_PENDING_TTL_SECONDS = 600;

    public function __construct(private readonly OtpService $otp) {}

    /**
     * Step 1: validate email/password, then send OTP to the admin's registered mobile.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['اطلاعات ورود نادرست است.'],
            ]);
        }

        if (! $user->is_admin) {
            throw ValidationException::withMessages([
                'email' => ['شما دسترسی مدیریت ندارید.'],
            ]);
        }

        $mobile = Mobile::normalize($user->mobile);
        if (! $mobile) {
            throw ValidationException::withMessages([
                'email' => ['برای ورود به پنل، شماره موبایل در حساب مدیر ثبت نشده است.'],
            ]);
        }

        Cache::put($this->adminLoginPendingKey($mobile), $user->id, self::ADMIN_LOGIN_PENDING_TTL_SECONDS);

        try {
            $this->otp->send($mobile, OtpPurpose::AdminLogin, $request->ip(), $request->userAgent());
        } catch (OtpException $e) {
            Cache::forget($this->adminLoginPendingKey($mobile));

            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success([
            'otp_required' => true,
            'mobile' => $mobile,
            'mobile_masked' => Mobile::mask($mobile),
            'expires_in' => 120,
        ]);
    }

    /** @deprecated Use login + resendOtp after password verification */
    public function sendOtp(AdminSendOtpRequest $request): JsonResponse
    {
        return $this->resendOtpInternal($request->string('mobile'), $request->ip(), $request->userAgent());
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        return $this->resendOtpInternal($data['mobile'], $request->ip(), $request->userAgent());
    }

    private function resendOtpInternal(string $rawMobile, ?string $ip, ?string $userAgent): JsonResponse
    {
        $mobile = Mobile::normalize($rawMobile);

        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        $pendingUserId = Cache::get($this->adminLoginPendingKey($mobile));
        if (! $pendingUserId) {
            return ApiResponse::error('login_required', 'ابتدا ایمیل و رمز عبور را وارد کنید.', 403);
        }

        $admin = User::query()
            ->whereKey($pendingUserId)
            ->where('is_admin', true)
            ->first();

        if (! $admin || Mobile::normalize($admin->mobile) !== $mobile) {
            Cache::forget($this->adminLoginPendingKey($mobile));

            return ApiResponse::error('forbidden', 'این شماره برای ورود به پنل مدیریت مجاز نیست.', 403);
        }

        try {
            $this->otp->send($mobile, OtpPurpose::AdminLogin, $ip, $userAgent);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success(['mobile' => $mobile, 'expires_in' => 120]);
    }

    public function verifyOtp(AdminVerifyOtpRequest $request): JsonResponse
    {
        $mobile = Mobile::normalize($request->string('mobile'));

        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        try {
            $this->otp->verify($mobile, $request->string('code'), OtpPurpose::AdminLogin);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_invalid', $e->getMessage(), 422);
        }

        $pendingUserId = Cache::get($this->adminLoginPendingKey($mobile));
        if (! $pendingUserId) {
            return ApiResponse::error('login_required', 'ابتدا ایمیل و رمز عبور را وارد کنید.', 403);
        }

        $user = User::query()
            ->whereKey($pendingUserId)
            ->where('is_admin', true)
            ->first();

        if (! $user || Mobile::normalize($user->mobile) !== $mobile) {
            Cache::forget($this->adminLoginPendingKey($mobile));

            return ApiResponse::error('forbidden', 'این شماره برای ورود به پنل مدیریت مجاز نیست.', 403);
        }

        Cache::forget($this->adminLoginPendingKey($mobile));

        if ($user->mobile_verified_at === null) {
            $user->update(['mobile_verified_at' => now()]);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('bahram-admin', ['*'], now()->addDays(7))->plainTextToken;

        return response()->json([
            'token' => $token,
            'data' => $this->userPayload($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()?->currentAccessToken();
        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json(null, 204);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        return response()->json(['data' => $this->userPayload($user)]);
    }

    /** @return array<string, mixed> */
    private function userPayload(User $user): array
    {
        $roles = $user->getRoleNames()->values()->all();
        $permissions = $user->getAllPermissions()->pluck('name')->values()->all();

        if ($user->isSuperAdmin() && $permissions === []) {
            $permissions = \App\Support\PermissionCatalog::all();
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'roles' => $roles,
            'permissions' => $permissions,
            'is_super_admin' => $user->isSuperAdmin(),
        ];
    }

    private function adminLoginPendingKey(string $mobile): string
    {
        return 'admin_login_pending:'.$mobile;
    }
}
