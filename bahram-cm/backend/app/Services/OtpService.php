<?php

namespace App\Services;

use App\Enums\OtpPurpose;
use App\Models\OtpCode;
use App\Services\Exceptions\OtpException;
use Illuminate\Support\Facades\Hash;
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

    public function __construct(private readonly SmsService $sms) {}

    public function send(string $mobile, OtpPurpose $purpose, ?string $ip = null, ?string $userAgent = null): void
    {
        $resendKey = "otp:resend:{$mobile}:{$purpose->value}";
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

        $this->sms->sendOtp($mobile, $code);
    }

    public function verify(string $mobile, string $code, OtpPurpose $purpose): void
    {
        $otp = OtpCode::query()
            ->where('mobile', $mobile)
            ->where('purpose', $purpose->value)
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
    }
}
