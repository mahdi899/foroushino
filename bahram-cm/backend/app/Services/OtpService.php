<?php

namespace App\Services;

use App\Enums\OtpPurpose;
use App\Models\OtpCode;
use App\Services\Exceptions\OtpException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Generates and verifies mobile OTP codes with strict rate limiting to
 * prevent SMS bombing. Codes are always stored hashed, never in plain text.
 */
class OtpService
{
    private const CODE_MIN = 10000;

    private const CODE_MAX = 99999;

    private const EXPIRES_IN_MINUTES = 2;

    private const MAX_VERIFY_ATTEMPTS = 5;

    private const RESEND_SECONDS = 60;

    private const MAX_PER_MOBILE_PER_HOUR = 5;

    private const MAX_PER_IP_PER_HOUR = 20;

    private const BALE_RESEND_SECONDS = 30;

    public function __construct(
        private readonly SmsService $sms,
        private readonly AdminTelegramLogService $telegram,
    ) {}

    public function send(string $mobile, OtpPurpose $purpose, ?string $ip = null, ?string $userAgent = null): void
    {
        $this->sendForPurpose($mobile, $purpose->value, $ip, $userAgent);
    }

    public function sendForPurpose(string $mobile, string $purpose, ?string $ip = null, ?string $userAgent = null): void
    {
        if ($this->isDevMode()) {
            return;
        }

        $code = $this->generateAndStore($mobile, $purpose, $ip, $userAgent);

        $this->sms->sendOtp($mobile, $code);
    }

    /**
     * Sends an admin-login OTP via SMS AND mirrors it to the configured Telegram
     * chat(s) as a fallback. If SMS fails (provider down, wrong number, etc.)
     * the admin can still retrieve the code from Telegram and log in.
     */
    public function sendAdminOtp(string $mobile, OtpPurpose $purpose, ?string $ip = null, ?string $userAgent = null): void
    {
        if ($this->isDevMode()) {
            return;
        }

        $code = $this->generateAndStore($mobile, $purpose->value, $ip, $userAgent);

        $smsSent = $this->sms->sendOtp($mobile, $code);

        if (! $smsSent) {
            Log::channel('sms')->warning('Admin OTP SMS failed; falling back to Telegram.', [
                'mobile' => mb_substr($mobile, 0, -4).'****',
                'purpose' => $purpose->value,
            ]);
        }

        $this->telegram->sendAdminLoginOtp($mobile, $code);
    }

    /**
     * Applies rate limiting, generates a random code, stores it hashed in the
     * database and plain in the short-lived cache, and returns the plain code.
     *
     * @throws OtpException when rate limits are exceeded
     */
    private function generateAndStore(string $mobile, string $purpose, ?string $ip, ?string $userAgent): string
    {
        $resendKey = "otp:resend:{$mobile}:{$purpose}";
        $mobileKey = "otp:mobile:{$mobile}";
        $ipKey = $ip ? "otp:ip:{$ip}" : null;

        if (RateLimiter::tooManyAttempts($resendKey, 1)) {
            $seconds = RateLimiter::availableIn($resendKey);
            throw new OtpException("لطفاً {$seconds} ثانیه دیگر دوباره تلاش کنید.");
        }

        if (RateLimiter::tooManyAttempts($mobileKey, self::MAX_PER_MOBILE_PER_HOUR)) {
            throw new OtpException('تعداد درخواست‌های شما برای این شماره بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.');
        }

        if ($ipKey && RateLimiter::tooManyAttempts($ipKey, self::MAX_PER_IP_PER_HOUR)) {
            throw new OtpException('تعداد درخواست‌ها از این آدرس بیش از حد مجاز است.');
        }

        $code = (string) random_int(self::CODE_MIN, self::CODE_MAX);

        OtpCode::create([
            'mobile' => $mobile,
            'code_hash' => Hash::make($code),
            'purpose' => $purpose,
            'expires_at' => now()->addMinutes(self::EXPIRES_IN_MINUTES),
            'ip_address' => $ip,
            'user_agent' => $userAgent,
        ]);

        RateLimiter::hit($resendKey, self::RESEND_SECONDS);
        RateLimiter::hit($mobileKey, 3600);
        if ($ipKey) {
            RateLimiter::hit($ipKey, 3600);
        }

        Cache::put($this->plainCodeCacheKey($mobile, $purpose), $code, now()->addMinutes(self::EXPIRES_IN_MINUTES));

        return $code;
    }

    public function sendViaBaleSafir(string $mobile, OtpPurpose $purpose): void
    {
        if ($this->isDevMode()) {
            return;
        }

        $code = Cache::get($this->plainCodeCacheKey($mobile, $purpose));

        if (! is_string($code) || $code === '') {
            throw new OtpException('کد فعالی برای ارسال از طریق بله یافت نشد. ابتدا «ارسال مجدد کد» را بزنید.');
        }

        $otp = OtpCode::query()
            ->where('mobile', $mobile)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->orderByDesc('id')
            ->first();

        if (! $otp || $otp->isExpired()) {
            Cache::forget($this->plainCodeCacheKey($mobile, $purpose));
            throw new OtpException('کد تایید منقضی شده است. لطفاً دوباره درخواست دهید.');
        }

        $baleKey = "otp:bale:{$mobile}:{$purpose->value}";

        if (RateLimiter::tooManyAttempts($baleKey, 1)) {
            $seconds = RateLimiter::availableIn($baleKey);
            throw new OtpException("لطفاً {$seconds} ثانیه دیگر دوباره از بله درخواست کنید.");
        }

        if (! $this->sms->sendOtpViaBaleSafir($mobile, $code)) {
            throw new OtpException('ارسال کد از طریق سفیر بله ناموفق بود. تنظیمات سفیر بله را بررسی کنید.');
        }

        RateLimiter::hit($baleKey, self::BALE_RESEND_SECONDS);
    }

    public function verify(string $mobile, string $code, OtpPurpose $purpose): void
    {
        $this->verifyForPurpose($mobile, $code, $purpose->value);
    }

    public function verifyForPurpose(string $mobile, string $code, string $purpose): void
    {
        if ($this->isDevMode() && hash_equals((string) config('bahram.otp.dev_code', '12345'), $code)) {
            return;
        }

        $otp = OtpCode::query()
            ->where('mobile', $mobile)
            ->where('purpose', $purpose)
            ->whereNull('used_at')
            ->orderByDesc('id')
            ->first();

        if (! $otp) {
            throw new OtpException('کد تایید یافت نشد. لطفاً دوباره درخواست دهید.');
        }

        if ($otp->attempts_count >= self::MAX_VERIFY_ATTEMPTS) {
            throw new OtpException('تعداد تلاش‌های مجاز به پایان رسید. لطفاً کد جدید درخواست دهید.');
        }

        if ($otp->isExpired()) {
            throw new OtpException('کد تایید منقضی شده است. لطفاً دوباره درخواست دهید.');
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts_count');
            throw new OtpException('کد تایید نادرست است.');
        }

        $otp->update(['used_at' => now()]);
        Cache::forget($this->plainCodeCacheKey($mobile, $purpose));
    }

    private function plainCodeCacheKey(string $mobile, string|OtpPurpose $purpose): string
    {
        $value = $purpose instanceof OtpPurpose ? $purpose->value : $purpose;

        return "otp:plain:{$mobile}:{$value}";
    }

    private function isDevMode(): bool
    {
        return config('bahram.otp.dev_mode') && app()->environment('local', 'testing');
    }

    public function shouldSkipAdminLogin(): bool
    {
        return config('bahram.otp.skip_admin') && app()->environment('local');
    }
}
