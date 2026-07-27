<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Cache\SyncCache;

/**
 * Local discount preview from host MySQL cache (pushed from Iran).
 * Checks capacity via uses_reserved vs max_uses. Iran re-validates at checkout.
 */
final class HostDiscountPreview
{
    public function __construct(private readonly SyncCache $cache) {}

    /**
     * @return array{ok: bool, message?: string, coupon?: string, coupon_discount?: int, final_amount?: int, subtotal?: int}
     */
    public function preview(string $code, int $productId): array
    {
        $normalized = strtoupper(trim($code));
        if ($normalized === '') {
            return ['ok' => false, 'message' => 'کد تخفیف معتبر نیست.'];
        }

        $row = $this->cache->findDiscountCode($normalized);
        if ($row === null) {
            return ['ok' => false, 'message' => 'کد تخفیف معتبر نیست.'];
        }

        if (empty($row['is_active'])) {
            return ['ok' => false, 'message' => 'این کد تخفیف غیرفعال است.'];
        }

        $now = time();
        $starts = $this->parseTs($row['starts_at'] ?? null);
        if ($starts !== null && $now < $starts) {
            return ['ok' => false, 'message' => 'این کد تخفیف هنوز فعال نشده است.'];
        }
        $ends = $this->parseTs($row['ends_at'] ?? null);
        if ($ends !== null && $now > $ends) {
            return ['ok' => false, 'message' => 'مهلت استفاده از این کد تخفیف به پایان رسیده است.'];
        }

        if (! empty($row['requires_link'])) {
            return ['ok' => false, 'message' => 'این کد تخفیف فقط از طریق لینک اختصاصی قابل استفاده است.'];
        }

        $maxUses = $row['max_uses'] !== null && $row['max_uses'] !== '' ? (int) $row['max_uses'] : null;
        $usesReserved = (int) ($row['uses_reserved'] ?? 0);
        if ($maxUses !== null && $usesReserved >= $maxUses) {
            return ['ok' => false, 'message' => 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.'];
        }

        $productIds = $this->decodeIntList($row['product_ids_json'] ?? '[]');
        $restriction = (string) ($row['restriction'] ?? 'all');
        if ($restriction === 'specific_products' || $productIds !== []) {
            if ($productIds !== [] && ! in_array($productId, $productIds, true)) {
                return ['ok' => false, 'message' => 'این کد تخفیف برای این محصول قابل استفاده نیست.'];
            }
        }

        $product = $this->cache->findProduct($productId);
        if ($product === null) {
            return ['ok' => false, 'message' => 'محصول یافت نشد.'];
        }

        $base = (int) ($product['price'] ?? 0);
        $sale = isset($product['sale_price']) && (int) $product['sale_price'] > 0
            ? (int) $product['sale_price']
            : null;
        $subtotal = ($sale !== null && $sale < $base) ? $sale : $base;
        if ($subtotal < 0) {
            $subtotal = 0;
        }

        $minOrder = $row['min_order_amount'] !== null && $row['min_order_amount'] !== ''
            ? (int) $row['min_order_amount']
            : null;
        if ($minOrder !== null && $subtotal < $minOrder) {
            return ['ok' => false, 'message' => 'حداقل مبلغ خرید برای این کد تخفیف رعایت نشده است.'];
        }

        $type = (string) ($row['discount_type'] ?? 'percent');
        $value = (int) ($row['discount_value'] ?? 0);
        $couponDiscount = match ($type) {
            'fixed' => min($value, $subtotal),
            default => (int) round($subtotal * min($value, 100) / 100),
        };
        $maxDiscount = $row['max_discount_amount'] !== null && $row['max_discount_amount'] !== ''
            ? (int) $row['max_discount_amount']
            : null;
        if ($maxDiscount !== null) {
            $couponDiscount = min($couponDiscount, $maxDiscount);
        }
        $couponDiscount = max(min($couponDiscount, $subtotal), 0);

        return [
            'ok' => true,
            'coupon' => (string) ($row['code'] ?? $normalized),
            'coupon_discount' => $couponDiscount,
            'final_amount' => max($subtotal - $couponDiscount, 0),
            'subtotal' => $subtotal,
        ];
    }

    private function parseTs(mixed $value): ?int
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }
        $ts = strtotime($value);

        return $ts !== false ? $ts : null;
    }

    /** @return list<int> */
    private function decodeIntList(mixed $json): array
    {
        if (! is_string($json) || $json === '') {
            return [];
        }
        $decoded = json_decode($json, true);
        if (! is_array($decoded)) {
            return [];
        }

        return array_values(array_map('intval', $decoded));
    }
}
