<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Issues short-lived, single-use tokens so only the payer returning from the
 * gateway can complete their order profile (not anyone who guesses order_number).
 */
class OrderCompletionTokenService
{
    private const TTL_HOURS = 48;

    private const CACHE_PREFIX = 'order_completion_token:';

    public function issue(Order $order): string
    {
        $nonce = Str::random(32);
        $payload = [
            'oid' => $order->id,
            'exp' => now()->addHours(self::TTL_HOURS)->timestamp,
            'n' => $nonce,
        ];

        $body = $this->encodePayload($payload);
        $signature = $this->sign($body);

        Cache::put(
            self::CACHE_PREFIX.$nonce,
            $order->id,
            now()->addHours(self::TTL_HOURS),
        );

        return $body.'.'.$signature;
    }

    public function resolve(string $token): ?Order
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
        $cachedOrderId = Cache::get(self::CACHE_PREFIX.$nonce);
        if (! $cachedOrderId || (int) $cachedOrderId !== (int) ($payload['oid'] ?? 0)) {
            return null;
        }

        $order = Order::query()->find($cachedOrderId);
        if (! $order || ! $order->isPaid() || ! $order->needsProfileCompletion()) {
            return null;
        }

        return $order;
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

    /** @param  array{oid: int, exp: int, n: string}  $payload */
    private function encodePayload(array $payload): string
    {
        return rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    /** @return array{oid?: int, exp?: int, n?: string}|null */
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
