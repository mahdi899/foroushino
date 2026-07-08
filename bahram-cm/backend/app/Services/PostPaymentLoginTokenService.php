<?php

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Short-lived token issued after a guest completes their post-payment profile.
 * Allows OTP login without re-entering the phone number.
 */
class PostPaymentLoginTokenService
{
    private const TTL_MINUTES = 30;

    private const CACHE_PREFIX = 'post_payment_login:';

    public function issue(Order $order): ?string
    {
        $order->loadMissing('user');
        $user = $order->user;
        if (! $user || $user->is_admin) {
            return null;
        }

        $nonce = Str::random(32);
        $payload = [
            'uid' => $user->id,
            'oid' => $order->id,
            'exp' => now()->addMinutes(self::TTL_MINUTES)->timestamp,
            'n' => $nonce,
        ];

        $body = $this->encodePayload($payload);
        $signature = $this->sign($body);

        Cache::put(
            self::CACHE_PREFIX.$nonce,
            ['user_id' => $user->id, 'order_id' => $order->id],
            now()->addMinutes(self::TTL_MINUTES),
        );

        return $body.'.'.$signature;
    }

    /** @return array{0: User, 1: string}|null */
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
        if (
            ! is_array($cached)
            || (int) ($cached['user_id'] ?? 0) !== (int) ($payload['uid'] ?? 0)
            || (int) ($cached['order_id'] ?? 0) !== (int) ($payload['oid'] ?? 0)
        ) {
            return null;
        }

        $order = Order::query()->find($cached['order_id']);
        if (! $order || ! $order->isPaid() || $order->needsProfileCompletion()) {
            return null;
        }

        $user = User::query()->where('id', $cached['user_id'])->where('is_admin', false)->first();
        if (! $user || ! $user->mobile) {
            return null;
        }

        return [$user, $user->mobile];
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

    /** @param  array{uid: int, oid: int, exp: int, n: string}  $payload */
    private function encodePayload(array $payload): string
    {
        return rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    /** @return array{uid?: int, oid?: int, exp?: int, n?: string}|null */
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
