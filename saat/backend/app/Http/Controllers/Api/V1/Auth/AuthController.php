<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\Availability;
use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\V1\Auth\DevLoginRequest;
use App\Http\Requests\V1\Auth\PasswordLoginRequest;
use App\Http\Requests\V1\Auth\RequestPhoneOtpRequest;
use App\Http\Requests\V1\Auth\RequestTelegramOtpRequest;
use App\Http\Requests\V1\Auth\TelegramLoginRequest;
use App\Http\Requests\V1\Auth\TelegramWidgetLoginRequest;
use App\Http\Requests\V1\Auth\VerifyPhoneOtpRequest;
use App\Http\Requests\V1\Auth\VerifyTelegramOtpRequest;
use App\Http\Resources\V1\UserResource;
use App\Models\User;
use App\Models\Wallet;
use App\Services\Auth\DemoAuthService;
use App\Services\Auth\InvalidTelegramInitDataException;
use App\Services\Auth\PhoneOtpService;
use App\Services\Auth\TelegramAuthVerifier;
use App\Support\ApiResponse;
use App\Support\PasswordLogin;
use App\Support\PhoneNormalizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use RuntimeException;

class AuthController extends Controller
{
    public function __construct(
        private readonly TelegramAuthVerifier $telegramAuthVerifier,
        private readonly PhoneOtpService $phoneOtp,
        private readonly DemoAuthService $demoAuth,
    ) {}

    public function telegram(TelegramLoginRequest $request): JsonResponse
    {
        try {
            $telegramUser = $this->telegramAuthVerifier->verify($request->string('init_data')->toString());
        } catch (InvalidTelegramInitDataException $e) {
            return ApiResponse::error($e->getMessage(), status: 401, code: 'invalid_telegram_data');
        }

        return $this->issueTelegramToken($telegramUser, 'telegram-webapp');
    }

    public function telegramWidget(TelegramWidgetLoginRequest $request): JsonResponse
    {
        try {
            $telegramUser = $this->telegramAuthVerifier->verifyWidget($request->validated());
        } catch (InvalidTelegramInitDataException $e) {
            return ApiResponse::error($e->getMessage(), status: 401, code: 'invalid_telegram_data');
        }

        return $this->issueTelegramToken($telegramUser, 'telegram-widget');
    }

    public function demoAccounts(): JsonResponse
    {
        $accounts = $this->demoAuth->publicAccounts();

        if ($accounts === []) {
            return ApiResponse::error('حساب دمو فعال نیست.', status: 404, code: 'demo_disabled');
        }

        return ApiResponse::success($accounts);
    }

    public function requestPhoneOtp(RequestPhoneOtpRequest $request): JsonResponse
    {
        $phone = $request->string('phone')->toString();
        $method = $request->filled('method') ? $request->string('method')->toString() : null;

        try {
            $result = $this->phoneOtp->requestForPhone($phone, $method);
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'otp_request_failed');
        }

        $channel = $result['channel'];
        $demo = $this->demoAuth->accountForPhone($phone);

        return ApiResponse::success([
            'channel' => $channel,
            'password_available' => $result['password_available'],
            'otp_available' => $result['otp_available'],
            'hint' => match ($channel) {
                'demo' => "کد ثابت دمو: {$demo['otp']}",
                'password' => 'رمز عبور حساب خود را وارد کنید.',
                'choice' => 'رمز عبور یا کد تلگرام را انتخاب کنید.',
                default => 'کد ورود به تلگرامت ارسال شد.',
            },
        ], match ($channel) {
            'demo' => 'کد دمو آماده است.',
            'password' => 'ورود با رمز عبور',
            'choice' => 'روش ورود را انتخاب کنید',
            default => 'کد ورود به تلگرامت ارسال شد.',
        });
    }

    public function passwordLogin(PasswordLoginRequest $request): JsonResponse
    {
        $phone = PhoneNormalizer::normalize($request->string('phone')->toString());
        $user = User::query()->where('phone', $phone)->first();

        if (! PasswordLogin::enabledForUser($user)) {
            return ApiResponse::error('شماره یا رمز عبور نادرست است.', status: 401, code: 'invalid_credentials');
        }

        if (! Hash::check($request->string('password')->toString(), (string) $user->password)) {
            return ApiResponse::error('شماره یا رمز عبور نادرست است.', status: 401, code: 'invalid_credentials');
        }

        return $this->issueTokenForUser($user, 'password');
    }

    public function verifyPhoneOtp(VerifyPhoneOtpRequest $request): JsonResponse
    {
        $phone = $request->string('phone')->toString();

        try {
            $this->phoneOtp->verifyPhoneCode($phone, $request->string('code')->toString());
        } catch (RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'invalid_otp');
        }

        $user = $this->demoAuth->accountForPhone($phone)
            ? $this->demoAuth->ensureDemoUser($phone)
            : User::query()->where('phone', $phone)->first();

        if (! $user?->is_active) {
            return ApiResponse::error('حساب کاربری شما غیرفعال شده است.', status: 403, code: 'account_disabled');
        }

        return $this->issueTokenForUser($user, 'phone-otp');
    }

    public function requestTelegramOtp(RequestTelegramOtpRequest $request): JsonResponse
    {
        try {
            $this->phoneOtp->requestForInitData($request->string('init_data')->toString());
        } catch (InvalidTelegramInitDataException|RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'otp_request_failed');
        }

        return ApiResponse::success(message: 'کد ورود به تلگرامت ارسال شد.');
    }

    public function verifyTelegramOtp(VerifyTelegramOtpRequest $request): JsonResponse
    {
        try {
            $telegramUser = $this->telegramAuthVerifier->verify($request->string('init_data')->toString());
            $this->phoneOtp->verifyTelegramCode($telegramUser['id'], $request->string('code')->toString());
        } catch (InvalidTelegramInitDataException|RuntimeException $e) {
            return ApiResponse::error($e->getMessage(), status: 422, code: 'invalid_otp');
        }

        return $this->issueTelegramToken($telegramUser, 'telegram-otp');
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

    /**
     * @param  array{id: int, first_name: string, last_name: ?string, username: ?string, photo_url: ?string}  $telegramUser
     */
    private function issueTelegramToken(array $telegramUser, string $tokenName): JsonResponse
    {
        $user = User::query()->firstOrNew(['telegram_id' => $telegramUser['id']]);

        if (! $user->exists) {
            $user->fill([
                'name' => trim("{$telegramUser['first_name']} ".($telegramUser['last_name'] ?? '')),
                'email' => 'tg_'.$telegramUser['id'].'@telegram.saat.local',
                'password' => Hash::make(Str::random(40)),
                'availability' => Availability::Offline,
                'is_active' => true,
            ]);
            $user->save();
            $user->assignRole(RoleName::Agent->value);
            Wallet::query()->firstOrCreate(['user_id' => $user->id]);
        }

        if (! $user->is_active) {
            return ApiResponse::error('حساب کاربری شما غیرفعال شده است.', status: 403, code: 'account_disabled');
        }

        return $this->issueTokenForUser($user, $tokenName);
    }

    private function issueTokenForUser(User $user, string $tokenName): JsonResponse
    {
        if (! $user->is_active) {
            return ApiResponse::error('حساب کاربری شما غیرفعال شده است.', status: 403, code: 'account_disabled');
        }

        $token = $user->createToken($tokenName)->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => new UserResource($user->load('team')),
        ], 'ورود موفق');
    }
}
