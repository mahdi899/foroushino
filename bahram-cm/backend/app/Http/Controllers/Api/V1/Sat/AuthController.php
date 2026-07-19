<?php

namespace App\Http\Controllers\Api\V1\Sat;

use App\Enums\OtpPurpose;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\AdminVerifyOtpRequest;
use App\Http\Requests\V1\LoginRequest;
use App\Models\User;
use App\Services\Exceptions\OtpException;
use App\Services\OtpService;
use App\Services\Sat\SatAccessService;
use App\Support\ApiResponse;
use App\Support\Mobile;
use App\Support\SatPermissionCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const LOGIN_PENDING_TTL_SECONDS = 600;

    public function __construct(
        private readonly OtpService $otp,
        private readonly SatAccessService $access,
    ) {}

    /**
     * Step 1: email/password — no public registration; account must exist beforehand.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::query()->where('email', $request->string('email'))->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['اطلاعات ورود نادرست است.'],
            ]);
        }

        if (! $this->access->isSatStaff($user)) {
            throw ValidationException::withMessages([
                'email' => ['شما دسترسی به پنل سات ندارید.'],
            ]);
        }

        $mobile = Mobile::normalize($user->mobile);
        if (! $mobile) {
            throw ValidationException::withMessages([
                'email' => ['برای ورود، شماره موبایل در حساب شما ثبت نشده است.'],
            ]);
        }

        if ($this->otp->shouldSkipAdminLoginOtpFor($user)) {
            return $this->issueTokenResponse($user);
        }

        Cache::put($this->loginPendingKey($mobile), $user->id, self::LOGIN_PENDING_TTL_SECONDS);

        try {
            $this->otp->sendAdminOtp($mobile, OtpPurpose::SatLogin, $request->ip(), $request->userAgent());
        } catch (OtpException $e) {
            Cache::forget($this->loginPendingKey($mobile));

            return ApiResponse::error('otp_rate_limited', $e->getMessage(), 429);
        }

        return ApiResponse::success([
            'otp_required' => true,
            'mobile' => $mobile,
            'mobile_masked' => Mobile::mask($mobile),
            'expires_in' => 120,
        ]);
    }

    public function resendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'mobile' => ['required', 'string', 'max:20'],
        ]);

        $mobile = Mobile::normalize($data['mobile']);
        if (! $mobile) {
            return ApiResponse::error('invalid_mobile', 'شماره موبایل معتبر نیست.', 422);
        }

        $pendingUserId = Cache::get($this->loginPendingKey($mobile));
        if (! $pendingUserId) {
            return ApiResponse::error('login_required', 'ابتدا ایمیل و رمز عبور را وارد کنید.', 403);
        }

        $staff = User::query()
            ->whereKey($pendingUserId)
            ->where('is_sat_staff', true)
            ->first();

        if (! $staff || Mobile::normalize($staff->mobile) !== $mobile) {
            Cache::forget($this->loginPendingKey($mobile));

            return ApiResponse::error('forbidden', 'این شماره برای ورود به پنل سات مجاز نیست.', 403);
        }

        try {
            $this->otp->sendAdminOtp($mobile, OtpPurpose::SatLogin, $request->ip(), $request->userAgent());
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
            $this->otp->verify($mobile, $request->string('code'), OtpPurpose::SatLogin);
        } catch (OtpException $e) {
            return ApiResponse::error('otp_invalid', $e->getMessage(), 422);
        }

        $pendingUserId = Cache::get($this->loginPendingKey($mobile));
        if (! $pendingUserId) {
            return ApiResponse::error('login_required', 'ابتدا ایمیل و رمز عبور را وارد کنید.', 403);
        }

        $user = User::query()
            ->whereKey($pendingUserId)
            ->where('is_sat_staff', true)
            ->first();

        if (! $user || Mobile::normalize($user->mobile) !== $mobile) {
            Cache::forget($this->loginPendingKey($mobile));

            return ApiResponse::error('forbidden', 'این شماره برای ورود به پنل سات مجاز نیست.', 403);
        }

        Cache::forget($this->loginPendingKey($mobile));

        return $this->issueTokenResponse($user);
    }

    private function issueTokenResponse(User $user): JsonResponse
    {
        if ($user->mobile_verified_at === null) {
            $user->update(['mobile_verified_at' => now()]);
        }

        $user->update(['last_login_at' => now()]);

        $token = $user->createToken('bahram-sat', ['sat'], now()->addDays(7))->plainTextToken;

        return response()->json([
            'token' => $token,
            'data' => array_merge($this->userPayload($user), ['otp_required' => false]),
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
        $role = $this->access->primaryRole($user);
        $permissions = $user->getPermissionsViaRoles()
            ->where('guard_name', SatPermissionCatalog::GUARD)
            ->pluck('name')
            ->values()
            ->all();

        if ($this->access->isSatSuperAdmin($user)) {
            $permissions = SatPermissionCatalog::all();
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'mobile' => $user->mobile,
            'role' => $role?->value,
            'role_label' => $role?->label(),
            'permissions' => $permissions,
            'is_super_admin' => $this->access->isSatSuperAdmin($user),
            'sat_leader_id' => $user->sat_leader_id,
        ];
    }

    private function loginPendingKey(string $mobile): string
    {
        return 'sat_login_pending:'.$mobile;
    }
}
