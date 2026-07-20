<?php

namespace App\Services\Auth;

use App\Models\AppSetting;
use App\Models\User;
use App\Services\Sms\MelipayamakClient;
use App\Support\PasswordLogin;
use App\Support\PhoneNormalizer;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class PhoneOtpService
{
    public const TTL_SECONDS = 300;

    public function __construct(
        private readonly TelegramBotClient $telegram,
        private readonly DemoAuthService $demoAuth,
        private readonly MelipayamakClient $melipayamak,
    ) {}

    /**
     * @return array{channel: string, password_available: bool, otp_available: bool}
     */
    public function requestForPhone(string $phone, ?string $method = null): array
    {
        $normalized = PhoneNormalizer::normalize($phone);
        $demo = $this->demoAuth->accountForPhone($normalized);

        if ($demo !== null) {
            Cache::put($this->cacheKey("phone:{$normalized}"), $demo['otp'], self::TTL_SECONDS);

            return [
                'channel' => 'demo',
                'password_available' => false,
                'otp_available' => true,
            ];
        }

        $user = User::query()->where('phone', $normalized)->first();

        if (! $user) {
            throw new RuntimeException('این شماره در سیستم ثبت نشده است.');
        }

        if (! $user->is_active) {
            throw new RuntimeException('حساب کاربری شما غیرفعال شده است.');
        }

        $passwordAvailable = PasswordLogin::enabledForUser($user);
        $otpAvailable = $this->otpAvailableFor($user);

        if ($method === 'password') {
            if (! $passwordAvailable) {
                throw new RuntimeException('ورود با رمز عبور برای این شماره فعال نیست.');
            }

            return [
                'channel' => 'password',
                'password_available' => true,
                'otp_available' => $otpAvailable,
            ];
        }

        if ($method === 'otp') {
            if (! $otpAvailable) {
                throw new RuntimeException('ورود با کد تأیید برای این شماره فعال نیست. از رمز عبور استفاده کنید یا با مدیر تماس بگیرید.');
            }

            return [
                'channel' => $this->deliverOtp($user, $normalized),
                'password_available' => $passwordAvailable,
                'otp_available' => true,
            ];
        }

        if ($passwordAvailable && $otpAvailable) {
            return [
                'channel' => 'choice',
                'password_available' => true,
                'otp_available' => true,
            ];
        }

        if ($passwordAvailable) {
            return [
                'channel' => 'password',
                'password_available' => true,
                'otp_available' => false,
            ];
        }

        if ($otpAvailable) {
            return [
                'channel' => $this->deliverOtp($user, $normalized),
                'password_available' => false,
                'otp_available' => true,
            ];
        }

        throw new RuntimeException('برای ورود به رمز عبور از مدیر بگیرید یا پترن OTP ورود را در تنظیمات فعال کنید.');
    }

    /**
     * @return array{id: int, first_name: string, last_name: ?string, username: ?string, photo_url: ?string}
     */
    public function requestForInitData(string $initData): array
    {
        $telegramUser = app(TelegramAuthVerifier::class)->verify($initData);
        $this->sendToTelegramUser($telegramUser['id'], $this->issueCode("tg:{$telegramUser['id']}"));

        return $telegramUser;
    }

    public function verifyPhoneCode(string $phone, string $code): void
    {
        $normalized = PhoneNormalizer::normalize($phone);
        $demo = $this->demoAuth->accountForPhone($normalized);

        if ($demo !== null && hash_equals($demo['otp'], trim($code))) {
            return;
        }

        $this->assertValidCode("phone:{$normalized}", $code);
    }

    public function verifyTelegramCode(int $telegramId, string $code): void
    {
        $this->assertValidCode("tg:{$telegramId}", $code);
    }

    private function otpAvailableFor(User $user): bool
    {
        return $this->smsOtpAvailable() || (bool) $user->telegram_id;
    }

    private function smsOtpAvailable(): bool
    {
        if (AppSetting::int('meli_pattern_login') <= 0) {
            return false;
        }

        $config = AppSetting::melipayamakConfig();

        return $config['username'] !== '' && $config['password'] !== '';
    }

    private function deliverOtp(User $user, string $normalizedPhone): string
    {
        $code = $this->issueCode("phone:{$normalizedPhone}");

        if ($this->smsOtpAvailable()) {
            $patternId = AppSetting::int('meli_pattern_login');
            $this->melipayamak->sendByBaseNumber($normalizedPhone, $patternId, [$code]);

            return 'sms';
        }

        if ($user->telegram_id) {
            $this->sendToTelegramUser((int) $user->telegram_id, $code);

            return 'telegram';
        }

        throw new RuntimeException('ورود با کد تأیید برای این شماره فعال نیست.');
    }

    private function sendToTelegramUser(int $telegramId, string $code): void
    {
        $this->telegram->sendMessage(
            $telegramId,
            "کد ورود سات: {$code}\n\nاین کد تا ۵ دقیقه اعتبار دارد."
        );
    }

    private function issueCode(string $cacheKey): string
    {
        $code = str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);
        Cache::put($this->cacheKey($cacheKey), $code, self::TTL_SECONDS);

        return $code;
    }

    private function assertValidCode(string $cacheKey, string $code): void
    {
        $expected = Cache::get($this->cacheKey($cacheKey));

        if (! is_string($expected) || ! hash_equals($expected, trim($code))) {
            throw new RuntimeException('کد وارد شده نادرست یا منقضی شده است.');
        }

        Cache::forget($this->cacheKey($cacheKey));
    }

    private function cacheKey(string $key): string
    {
        return "saat:otp:{$key}";
    }
}
