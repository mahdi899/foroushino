<?php

namespace App\Modules\TelegramBot\Services;

use App\Models\Product;
use App\Models\User;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\OrderService;
use App\Services\ZarinpalPaymentService;
use Illuminate\Validation\ValidationException;

/**
 * Starts checkout for a Telegram user using the same OrderService /
 * DiscountService / referral fields as the website.
 */
class TelegramCheckoutService
{
    public function __construct(
        private readonly OrderService $orders,
        private readonly ZarinpalPaymentService $zarinpal,
    ) {}

    public function zarinpalEnabled(TelegramBot $bot): bool
    {
        return $bot->featureEnabled(BotFeatureFlag::ZarinpalPayment);
    }

    public function cardToCardEnabled(TelegramBot $bot): bool
    {
        return $bot->featureEnabled(BotFeatureFlag::CardToCardPayment);
    }

    /**
     * @return array{order_id: int, payment_url: string, amount: int}
     */
    public function startZarinpalCheckout(TelegramAccount $account, Product $product, ?string $discountCode = null): array
    {
        $bot = $account->bot ?? TelegramBot::query()->find($account->telegram_bot_id);
        if ($bot === null || ! $this->zarinpalEnabled($bot)) {
            throw ValidationException::withMessages([
                'payment' => 'پرداخت آنلاین زرین‌پال برای این ربات غیرفعال است.',
            ]);
        }

        $order = $this->createPendingOrder($account, $product, $discountCode);
        $payment = $this->zarinpal->request($order);

        return [
            'order_id' => $order->id,
            'payment_url' => $this->zarinpal->getPaymentUrl($payment),
            'amount' => (int) ($order->payable_amount ?? $order->final_amount ?? $product->sale_price ?? $product->price),
        ];
    }

    /**
     * @return array{order_id: int, amount: int, instructions: string}
     */
    public function startCardToCardCheckout(TelegramAccount $account, Product $product, ?string $discountCode = null): array
    {
        $bot = $account->bot ?? TelegramBot::query()->find($account->telegram_bot_id);
        if ($bot === null || ! $this->cardToCardEnabled($bot)) {
            throw ValidationException::withMessages([
                'payment' => 'پرداخت کارت‌به‌کارت برای این ربات غیرفعال است.',
            ]);
        }

        $order = $this->createPendingOrder($account, $product, $discountCode);

        return [
            'order_id' => $order->id,
            'amount' => (int) ($order->payable_amount ?? $order->final_amount ?? $product->sale_price ?? $product->price),
            'instructions' => $bot->cardToCardInstructions(),
        ];
    }

    /** @deprecated Use startZarinpalCheckout */
    public function startCheckout(TelegramAccount $account, Product $product, ?string $discountCode = null): array
    {
        return $this->startZarinpalCheckout($account, $product, $discountCode);
    }

    private function createPendingOrder(TelegramAccount $account, Product $product, ?string $discountCode): \App\Models\Order
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
            // Same key as website checkout (OrderService + DiscountService).
            $payload['coupon'] = strtoupper(trim($discountCode));
        }

        $ref = data_get($account->metadata, 'referred_by_code');
        if (filled($ref)) {
            $payload['ref'] = (string) $ref;
        }

        return $this->orders->create($payload, $user);
    }
}
