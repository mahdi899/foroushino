<?php

namespace App\Services\Auth;

use App\Models\User;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class PhoneOtpService
{
    public const TTL_SECONDS = 300;

    public function __construct(
        private readonly TelegramBotClient $telegram,
        private readonly DemoAuthService $demoAuth,
    ) {}

    public function requestForPhone(string $phone): string
    {
        $normalized = $this->normalizePhone($phone);
        $demo = $this->demoAuth->accountForPhone($normalized);

        if ($demo !== null) {
            Cache::put($this->cacheKey("phone:{$normalized}"), $demo['otp'], self::TTL_SECONDS);

            return 'demo';
        }

        $user = User::query()->where('phone', $normalized)->first();

        if (! $user?->telegram_id) {
            throw new RuntimeException('اجازه ورود فقط برای افراد ثبت‌نام‌شده است.');
        }

        $this->sendToTelegramUser((int) $user->telegram_id, $this->issueCode("phone:{$normalized}"));

        return 'telegram';
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
        $normalized = $this->normalizePhone($phone);
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

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        return $digits;
    }
}
