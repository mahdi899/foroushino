<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Short-lived token that binds a guest checkout payload to an OTP session.
 */
class GuestCheckoutTokenService
{
    private const TTL_MINUTES = 15;

    private const CACHE_PREFIX = 'guest_checkout:';

    /**
     * @param  array{
     *   product_id: int,
     *   customer_name: string,
     *   customer_phone: string,
     *   customer_extra_data?: array<string, mixed>|null,
     *   ref?: string|null,
     *   coupon?: string|null,
     *   coupon_via_link?: bool|null,
     * }  $checkout
     */
    public function issue(array $checkout): string
    {
        $nonce = Str::random(32);
        $payload = [
            'pid' => (int) $checkout['product_id'],
            'mob' => (string) $checkout['customer_phone'],
            'exp' => now()->addMinutes(self::TTL_MINUTES)->timestamp,
            'n' => $nonce,
        ];

        $body = $this->encodePayload($payload);
        $signature = $this->sign($body);

        Cache::put(
            self::CACHE_PREFIX.$nonce,
            $checkout,
            now()->addMinutes(self::TTL_MINUTES),
        );

        return $body.'.'.$signature;
    }

    /**
     * @return array{
     *   product_id: int,
     *   customer_name: string,
     *   customer_phone: string,
     *   customer_extra_data?: array<string, mixed>|null,
     *   ref?: string|null,
     *   coupon?: string|null,
     *   coupon_via_link?: bool|null,
     * }|null
     */
    public function resolve(string $token): ?array
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return null;
        }

        [$body, $signature] = $parts;
        if (! hash_equals($this->sign($body), $signature)) {
            return null;
        }

        $payload = $this->decodePayload($body);
        if (! $payload || (int) ($payload['exp'] ?? 0) < now()->timestamp) {
            return null;
        }

        $nonce = (string) ($payload['n'] ?? '');
        $cached = Cache::get(self::CACHE_PREFIX.$nonce);
        if (! is_array($cached)) {
            return null;
        }

        if ((int) ($cached['product_id'] ?? 0) !== (int) ($payload['pid'] ?? 0)) {
            return null;
        }

        if ((string) ($cached['customer_phone'] ?? '') !== (string) ($payload['mob'] ?? '')) {
            return null;
        }

        return $cached;
    }

    public function revoke(string $token): void
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return;
        }

        $payload = $this->decodePayload($parts[0]);
        if ($payload && isset($payload['n'])) {
            Cache::forget(self::CACHE_PREFIX.$payload['n']);
        }
    }

    /** @param  array{pid: int, mob: string, exp: int, n: string}  $payload */
    private function encodePayload(array $payload): string
    {
        return rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    /** @return array{pid?: int, mob?: string, exp?: int, n?: string}|null */
    private function decodePayload(string $body): ?array
    {
        $padding = strlen($body) % 4;
        if ($padding > 0) {
            $body .= str_repeat('=', 4 - $padding);
        }

        $json = base64_decode(strtr($body, '-_', '+/'), true);
        if ($json === false) {
            return null;
        }

        $data = json_decode($json, true);

        return is_array($data) ? $data : null;
    }

    private function sign(string $body): string
    {
        return hash_hmac('sha256', $body, (string) config('app.key'));
    }
}
