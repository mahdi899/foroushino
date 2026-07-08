<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Short-lived signed tokens for the payment result page.
 * Prevents forging ?status=success&order=… URLs — only the gateway callback can issue a token.
 */
class PaymentReceiptTokenService
{
    private const TTL_MINUTES = 60;

    private const CACHE_PREFIX = 'payment_receipt_token:';

    /** @param  'success'|'failed'|'cancelled'  $status */
    public function issue(?Order $order, string $status): string
    {
        $nonce = Str::random(32);
        $orderId = $order?->id ?? 0;

        $payload = [
            'oid' => $orderId,
            'st' => $status,
            'exp' => now()->addMinutes(self::TTL_MINUTES)->timestamp,
            'n' => $nonce,
        ];

        $body = $this->encodePayload($payload);
        $signature = $this->sign($body);

        Cache::put(
            self::CACHE_PREFIX.$nonce,
            ['order_id' => $orderId, 'status' => $status],
            now()->addMinutes(self::TTL_MINUTES),
        );

        return $body.'.'.$signature;
    }

    /**
     * @return array{status: string, order_number: ?string, product_slug: ?string}|null
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

        $status = (string) ($payload['st'] ?? '');
        if (! in_array($status, ['success', 'failed', 'cancelled'], true)) {
            return null;
        }

        $nonce = (string) ($payload['n'] ?? '');
        $cached = Cache::get(self::CACHE_PREFIX.$nonce);
        if (
            ! is_array($cached)
            || (string) ($cached['status'] ?? '') !== $status
            || (int) ($cached['order_id'] ?? -1) !== (int) ($payload['oid'] ?? -1)
        ) {
            return null;
        }

        $orderId = (int) ($payload['oid'] ?? 0);
        if ($orderId <= 0) {
            return ['status' => $status, 'order_number' => null, 'product_slug' => null];
        }

        $order = Order::query()->with('product')->find($orderId);
        if (! $order || ! $this->orderMatchesStatus($order, $status)) {
            return null;
        }

        return [
            'status' => $status,
            'order_number' => $order->order_number,
            'product_slug' => $order->product?->slug,
        ];
    }

    private function orderMatchesStatus(Order $order, string $status): bool
    {
        return match ($status) {
            'success' => $order->isPaid(),
            'failed' => in_array($order->status, ['failed'], true)
                || in_array($order->payment_status, ['failed'], true),
            'cancelled' => in_array($order->payment_status, ['pending', 'canceled'], true)
                && ! $order->isPaid(),
            default => false,
        };
    }

    /** @param  array{oid: int, st: string, exp: int, n: string}  $payload */
    private function encodePayload(array $payload): string
    {
        return rtrim(strtr(base64_encode(json_encode($payload, JSON_THROW_ON_ERROR)), '+/', '-_'), '=');
    }

    /** @return array{oid?: int, st?: string, exp?: int, n?: string}|null */
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
