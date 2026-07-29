<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramPaymentLink;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\Exceptions\PaymentException;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TelegramPaymentLinkService
{
    public function __construct(
        private readonly ZarinpalPaymentService $zarinpal,
        private readonly PurchaseGuardService $purchaseGuard,
        private readonly DiscountService $discounts,
    ) {}

    public function ttlMinutes(): int
    {
        return max(1, (int) config('bahram.telegram.payment_link_ttl_minutes', 30));
    }

    /**
     * @return array{link: TelegramPaymentLink, payment_url: string}
     */
    public function issueForOrder(Order $order, TelegramAccount $account): array
    {
        $token = Str::lower(Str::random(48));
        $link = TelegramPaymentLink::query()->create([
            'token' => $token,
            'order_id' => $order->id,
            'telegram_account_id' => $account->id,
            'expires_at' => now()->addMinutes($this->ttlMinutes()),
        ]);

        $url = TelegramSiteUrl::page('pay/telegram/'.$token);
        if ($url === null || $url === '') {
            $url = rtrim((string) config('bahram.frontend_url', 'https://rostami.app'), '/').'/pay/telegram/'.$token;
        }

        return ['link' => $link, 'payment_url' => $url];
    }

    /**
     * Revoke open payment links for the account and cancel their unpaid pending orders.
     *
     * @return array{revoked_links: int, cancelled_orders: int}
     */
    public function revokeOpenForAccount(TelegramAccount $account): array
    {
        $links = TelegramPaymentLink::query()
            ->where('telegram_account_id', $account->id)
            ->whereNull('revoked_at')
            ->where(function ($q): void {
                $q->whereNull('consumed_at')->orWhereHas('order', function ($orderQuery): void {
                    $orderQuery->where('status', 'pending_payment')->whereNull('paid_at');
                });
            })
            ->with('order')
            ->get();

        $revokedLinks = 0;
        $cancelledOrders = 0;
        $now = now();

        foreach ($links as $link) {
            if ($link->revoked_at === null) {
                $link->forceFill(['revoked_at' => $now])->save();
                $revokedLinks++;
            }

            $order = $link->order;
            if ($order && $order->status === 'pending_payment' && ! $order->isPaid()) {
                $this->cancelPendingOrder($order);
                $cancelledOrders++;
            }
        }

        return [
            'revoked_links' => $revokedLinks,
            'cancelled_orders' => $cancelledOrders,
        ];
    }

    /**
     * @return array{
     *     status: string,
     *     message: string,
     *     payment_url: ?string,
     *     amount: ?int,
     *     order_id: ?int,
     *     product_title: ?string,
     *     bot_url: ?string
     * }
     */
    public function resolve(string $token): array
    {
        $token = trim($token);
        $botUrl = TelegramSiteUrl::botStartDeepLink();

        if ($token === '') {
            return $this->fail('expired', 'لینک پرداخت نامعتبر است.', $botUrl);
        }

        $link = TelegramPaymentLink::query()
            ->where('token', $token)
            ->with(['order.product', 'order.user'])
            ->first();

        if ($link === null) {
            return $this->fail('expired', 'لینک پرداخت شما منقضی شده — لطفاً مجدد از ربات اقدام کنید.', $botUrl);
        }

        if ($link->isRevoked() || $link->isExpired()) {
            return $this->fail('expired', 'لینک پرداخت شما منقضی شده — لطفاً مجدد از ربات اقدام کنید.', $botUrl);
        }

        $order = $link->order;
        if ($order === null) {
            return $this->fail('expired', 'لینک پرداخت شما منقضی شده — لطفاً مجدد از ربات اقدام کنید.', $botUrl);
        }

        if ($order->isPaid()) {
            return [
                'status' => 'already_paid',
                'message' => 'این سفارش قبلاً پرداخت شده است.',
                'payment_url' => null,
                'amount' => (int) $order->final_amount,
                'order_id' => $order->id,
                'product_title' => $order->product?->title,
                'bot_url' => $botUrl,
            ];
        }

        if ($order->status !== 'pending_payment') {
            return $this->fail('cancelled', 'این سفارش دیگر قابل پرداخت نیست. لطفاً از ربات دوباره اقدام کنید.', $botUrl);
        }

        try {
            $this->repriceOrder($order);
            $order->refresh();
        } catch (ValidationException $e) {
            $message = (string) (collect($e->errors())->flatten()->first() ?: 'امکان پرداخت این سفارش وجود ندارد.');

            return $this->fail('unavailable', $message, $botUrl);
        }

        try {
            $paymentUrl = $this->ensureZarinpalUrl($order);
        } catch (PaymentException $e) {
            return $this->fail('unavailable', $e->getMessage() ?: 'درگاه پرداخت آماده نیست.', $botUrl);
        }

        if ($link->consumed_at === null) {
            $link->forceFill(['consumed_at' => now()])->save();
        }

        return [
            'status' => 'ok',
            'message' => 'در حال انتقال به درگاه پرداخت…',
            'payment_url' => $paymentUrl,
            'amount' => (int) $order->final_amount,
            'order_id' => $order->id,
            'product_title' => $order->product?->title,
            'bot_url' => $botUrl,
        ];
    }

    /**
     * Recompute list/final amounts from live product pricing + coupon eligibility.
     */
    public function repriceOrder(Order $order): Order
    {
        $order->loadMissing(['product', 'user']);
        $product = $order->product;

        if ($product === null || ! $product->is_active) {
            throw ValidationException::withMessages([
                'product_id' => 'محصول انتخاب‌شده در دسترس نیست.',
            ]);
        }

        /** @var User|null $user */
        $user = $order->user;
        $phone = (string) $order->customer_phone;

        $this->purchaseGuard->assertCanPurchase($user, $phone, $product);

        $pricing = $product->isReferenceChannelProduct()
            ? app(ReferenceChannelPricingService::class)->quoteForProduct($product, $user, $phone)
            : app(SeminarAttendeeCoursePricing::class)->quote($product, $user, $phone);

        $amount = (int) $pricing['amount'];
        $finalAmount = (int) $pricing['final_amount'];
        $saleDiscount = max($amount - $finalAmount, 0);

        $couponDiscount = 0;
        $discountCodeId = null;
        $couponCode = null;

        if (filled($order->coupon_code)) {
            try {
                $preview = $this->discounts->preview(
                    (string) $order->coupon_code,
                    $product,
                    $user,
                    $phone,
                    viaLink: false,
                );
                $couponDiscount = (int) $preview['coupon_discount'];
                $finalAmount = (int) $preview['final_amount'];
                $discountCodeId = $preview['discount_code']->id;
                $couponCode = $preview['discount_code']->normalizedCode();
            } catch (ValidationException) {
                // Coupon removed / no longer eligible — fall back to live base price.
                $couponDiscount = 0;
                $discountCodeId = null;
                $couponCode = null;
                $finalAmount = (int) $pricing['final_amount'];
            }
        }

        $order->update([
            'amount' => $amount,
            'discount_amount' => $saleDiscount + $couponDiscount,
            'coupon_discount_amount' => $couponDiscount,
            'discount_code_id' => $discountCodeId,
            'coupon_code' => $couponCode,
            'final_amount' => $finalAmount,
        ]);

        return $order->fresh(['product', 'user']) ?? $order;
    }

    private function ensureZarinpalUrl(Order $order): string
    {
        $existing = Payment::query()
            ->where('order_id', $order->id)
            ->where('gateway', 'zarinpal')
            ->where('status', 'pending')
            ->where('amount', (int) $order->final_amount)
            ->whereNotNull('authority')
            ->latest('id')
            ->first();

        if ($existing !== null) {
            return $this->zarinpal->getPaymentUrl($existing);
        }

        Payment::query()
            ->where('order_id', $order->id)
            ->where('gateway', 'zarinpal')
            ->where('status', 'pending')
            ->update(['status' => 'canceled']);

        $payment = $this->zarinpal->request($order);

        return $this->zarinpal->getPaymentUrl($payment);
    }

    private function cancelPendingOrder(Order $order): void
    {
        $order->update([
            'status' => 'cancelled',
            'payment_status' => 'canceled',
        ]);

        Payment::query()
            ->where('order_id', $order->id)
            ->where('status', 'pending')
            ->update(['status' => 'canceled']);
    }

    /**
     * @return array{
     *     status: string,
     *     message: string,
     *     payment_url: null,
     *     amount: null,
     *     order_id: null,
     *     product_title: null,
     *     bot_url: ?string
     * }
     */
    private function fail(string $status, string $message, ?string $botUrl): array
    {
        return [
            'status' => $status,
            'message' => $message,
            'payment_url' => null,
            'amount' => null,
            'order_id' => null,
            'product_title' => null,
            'bot_url' => $botUrl,
        ];
    }
}
