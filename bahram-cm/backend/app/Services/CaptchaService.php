<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class CaptchaService
{
    private const MATH_TTL_MINUTES = 10;

    private const TRUST_HOURS = 24;

    private const CACHE_KEY = 'captcha.config';

    /**
     * @return array{enabled?: bool, site_key?: string, secret_key?: string}
     */
    private function storedConfig(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            $value = Setting::query()
                ->where('group', 'captcha')
                ->where('key', 'config')
                ->value('value');

            return is_array($value) ? $value : [];
        });
    }

    public static function forgetCachedConfig(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public function isEnabled(): bool
    {
        $config = $this->storedConfig();
        if (array_key_exists('enabled', $config)) {
            return (bool) $config['enabled'];
        }

        return true;
    }

    public function isHoneypotEnabled(): bool
    {
        $config = $this->storedConfig();
        if (array_key_exists('honeypot_enabled', $config)) {
            return (bool) $config['honeypot_enabled'];
        }

        return true;
    }

    /** @param  'newsletter'|'leads'|'admin_login'  $form */
    public function isFormProtected(string $form): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $config = $this->storedConfig();
        $key = match ($form) {
            'newsletter' => 'protect_newsletter',
            'leads' => 'protect_leads',
            'admin_login' => 'protect_admin_login',
            default => null,
        };

        if ($key === null) {
            return true;
        }

        if (array_key_exists($key, $config)) {
            return (bool) $config[$key];
        }

        return true;
    }

    public function siteKey(): ?string
    {
        $stored = trim((string) ($this->storedConfig()['site_key'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('services.turnstile.site_key', ''));

        return $env !== '' ? $env : null;
    }

    public function secretKey(): ?string
    {
        $stored = trim((string) ($this->storedConfig()['secret_key'] ?? ''));
        if ($stored !== '') {
            return $stored;
        }

        $env = trim((string) config('services.turnstile.secret_key', ''));

        return $env !== '' ? $env : null;
    }

    /**
     * @return array{
     *   enabled: bool,
     *   site_key: string,
     *   has_turnstile: bool,
     *   honeypot_enabled: bool,
     *   protect_newsletter: bool,
     *   protect_leads: bool,
     *   protect_admin_login: bool
     * }
     */
    public function publicConfig(): array
    {
        $enabled = $this->isEnabled();
        $siteKey = $this->siteKey() ?? '';

        return [
            'enabled' => $enabled,
            'site_key' => $enabled ? $siteKey : '',
            'has_turnstile' => $enabled && $siteKey !== '',
            'honeypot_enabled' => $this->isHoneypotEnabled(),
            'protect_newsletter' => $this->isFormProtected('newsletter'),
            'protect_leads' => $this->isFormProtected('leads'),
            'protect_admin_login' => $this->isFormProtected('admin_login'),
        ];
    }

    /**
     * @return array{id: string, question: string}
     */
    public function createMathChallenge(): array
    {
        $a = random_int(1, 15);
        $b = random_int(1, 15);
        $subtract = (bool) random_int(0, 1);

        if ($subtract && $b > $a) {
            [$a, $b] = [$b, $a];
        }

        $answer = $subtract ? $a - $b : $a + $b;
        $operator = $subtract ? '−' : '+';
        $id = (string) Str::uuid();

        $this->storeMathAnswer($id, $answer);

        return [
            'id' => $id,
            'question' => $this->toPersianDigits("{$a} {$operator} {$b}"),
        ];
    }

    public function storeMathAnswer(string $id, int $answer): void
    {
        Cache::put($this->mathCacheKey($id), $answer, now()->addMinutes(self::MATH_TTL_MINUTES));
    }

    public function verify(?string $token, ?string $mathId, mixed $mathAnswer, ?string $ip = null, ?string $sessionId = null, bool $allowIpTrust = true): bool
    {
        if (! $this->isEnabled()) {
            return true;
        }

        if ($this->isSessionTrusted($sessionId)) {
            return true;
        }

        if ($allowIpTrust && $this->isIpTrusted($ip)) {
            return true;
        }

        $verified = false;

        if ($token !== null && $token !== '') {
            $verified = $this->verifyTurnstile($token, $ip);
        } elseif ($mathId !== null && $mathId !== '' && $mathAnswer !== null && $mathAnswer !== '') {
            $verified = $this->verifyMath($mathId, $mathAnswer);
        }

        if ($verified) {
            $this->markTrusted($ip, $sessionId);
        }

        return $verified;
    }

    public function isTrusted(?string $ip = null, ?string $sessionId = null): bool
    {
        return $this->isSessionTrusted($sessionId) || $this->isIpTrusted($ip);
    }

    public function isSessionTrusted(?string $sessionId): bool
    {
        if ($sessionId === null || trim($sessionId) === '') {
            return false;
        }

        return Cache::has($this->sessionTrustKey($sessionId));
    }

    public function isIpTrusted(?string $ip): bool
    {
        if ($ip === null || trim($ip) === '' || $ip === 'unknown') {
            return false;
        }

        return Cache::has($this->ipTrustKey($ip));
    }

    public function markTrusted(?string $ip = null, ?string $sessionId = null): void
    {
        $ttl = now()->addHours(self::TRUST_HOURS);

        if ($sessionId !== null && trim($sessionId) !== '') {
            Cache::put($this->sessionTrustKey($sessionId), true, $ttl);
        }

        if ($ip !== null && trim($ip) !== '' && $ip !== 'unknown') {
            Cache::put($this->ipTrustKey($ip), true, $ttl);
        }
    }

    private function ipTrustKey(string $ip): string
    {
        return 'captcha:trusted:ip:'.md5($ip);
    }

    private function sessionTrustKey(string $sessionId): string
    {
        return 'captcha:trusted:session:'.md5($sessionId);
    }

    public function verifyTurnstile(string $token, ?string $ip = null): bool
    {
        $secret = $this->secretKey();
        if (! $secret) {
            return false;
        }

        $payload = [
            'secret' => $secret,
            'response' => $token,
        ];

        if ($ip) {
            $payload['remoteip'] = $ip;
        }

        try {
            $response = Http::asForm()
                ->timeout(8)
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', $payload);

            if (! $response->successful()) {
                return false;
            }

            return (bool) $response->json('success');
        } catch (\Throwable) {
            return false;
        }
    }

    public function verifyMath(string $id, mixed $answer): bool
    {
        $key = $this->mathCacheKey($id);
        $expected = Cache::get($key);

        if ($expected === null) {
            return false;
        }

        $ok = (int) $expected === $this->normalizeNumericAnswer($answer);

        if ($ok) {
            Cache::forget($key);
        }

        return $ok;
    }

    private function mathCacheKey(string $id): string
    {
        return "captcha:math:{$id}";
    }

    private function normalizeNumericAnswer(mixed $answer): int
    {
        $value = is_string($answer) ? trim($answer) : (string) $answer;
        $value = strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);

        return (int) preg_replace('/\D/u', '', $value);
    }

    private function toPersianDigits(string $value): string
    {
        return strtr($value, [
            '0' => '۰', '1' => '۱', '2' => '۲', '3' => '۳', '4' => '۴',
            '5' => '۵', '6' => '۶', '7' => '۷', '8' => '۸', '9' => '۹',
            '+' => '+', '-' => '−',
        ]);
    }
}
