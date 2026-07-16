<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\OrderService;
use App\Services\ZarinpalPaymentService;
use Illuminate\Validation\ValidationException;

class TelegramCheckoutService
{
    public function __construct(
        private readonly OrderService $orders,
        private readonly ZarinpalPaymentService $zarinpal,
    ) {}

    /**
     * @return array{order_id: int, payment_url: string, amount: int}
     */
    public function startCheckout(TelegramAccount $account, Product $product, ?string $discountCode = null): array
    {
        /** @var User|null $user */
        $user = $account->user;

        if ($user === null || blank($account->mobile)) {
            throw ValidationException::withMessages([
                'account' => 'ابتدا حساب تلگرام را با موبایل تأیید کنید.',
            ]);
        }

        $payload = [
            'product_id' => $product->id,
            'customer_name' => $account->display_name ?: $user->name,
            'customer_phone' => $account->mobile,
        ];

        if (filled($discountCode)) {
            $payload['discount_code'] = $discountCode;
        }

        $order = $this->orders->create($payload, $user);
        $payment = $this->zarinpal->request($order);

        return [
            'order_id' => $order->id,
            'payment_url' => $this->zarinpal->getPaymentUrl($payment),
            'amount' => (int) ($order->payable_amount ?? $order->final_amount ?? $product->sale_price ?? $product->price),
        ];
    }
}
