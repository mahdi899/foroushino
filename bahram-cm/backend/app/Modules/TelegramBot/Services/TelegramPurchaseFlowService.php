<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Services\DiscountService;
use App\Services\Exceptions\PaymentException;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * User-facing purchase steps shared by message + callback handlers.
 */
class TelegramPurchaseFlowService
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly TelegramBotClientFactory $clients,
        private readonly TelegramProductCatalogService $catalog,
        private readonly TelegramCheckoutService $checkout,
        private readonly DiscountService $discounts,
        private readonly MainMenuKeyboard $mainMenu,
    ) {}

    public function applyDiscountCodeAndContinue(
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        string $code,
    ): void {
        $client = $this->clients->forBot($bot);
        $conversation = $this->conversations->forAccount($account);
        $productId = (int) data_get($conversation->context, 'checkout.product_id');
        $product = $this->catalog->findForTelegram($productId);

        if ($product === null) {
            $client->sendMessage($chatId, 'محصول یافت نشد. دوباره از منو خرید کنید.');
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);

            return;
        }

        if (in_array(trim($code), ['لغو', '/cancel', '-'], true)) {
            $this->conversations->transition($conversation, ConversationState::Idle, ['checkout' => null]);
            $client->sendMessage($chatId, 'خرید لغو شد.', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]);

            return;
        }

        try {
            $preview = $this->discounts->preview(
                $code,
                $product,
                $account->user,
                $account->mobile,
                viaLink: false,
            );
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'کد تخفیف معتبر نیست.';
            $client->sendMessage($chatId, (string) $message."\n\nدوباره کد را بفرستید یا «بدون کد تخفیف» را بزنید.");

            return;
        }

        $coupon = $preview['discount_code']->normalizedCode();
        $this->conversations->transition($conversation, ConversationState::Idle, [
            'checkout' => [
                'product_id' => $productId,
                'coupon' => $coupon,
            ],
        ]);

        $client->sendMessage(
            $chatId,
            '✅ کد «'.$coupon.'» اعمال شد.'
            ."\nتخفیف: ".number_format((int) $preview['coupon_discount']).' تومان'
            ."\nمبلغ نهایی: ".number_format((int) $preview['final_amount']).' تومان',
        );

        $this->proceedToPaymentMethods($bot, $account, $chatId, $productId, $coupon);
    }

    public function proceedToPaymentMethods(
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        int $productId,
        ?string $coupon,
    ): void {
        $client = $this->clients->forBot($bot);
        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            $client->sendMessage($chatId, 'محصول یافت نشد.');

            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::Idle, [
            'checkout' => [
                'product_id' => $productId,
                'coupon' => $coupon,
            ],
        ]);

        $zp = $this->checkout->zarinpalEnabled($bot);
        $c2c = $this->checkout->cardToCardEnabled($bot);

        if ($zp && $c2c) {
            $client->sendMessage($chatId, "{$product->title}\n\nروش پرداخت را انتخاب کنید:", [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [['text' => '💳 زرین‌پال (آنلاین)', 'callback_data' => 'pay:zp:'.$productId]],
                        [['text' => '🏧 کارت به کارت', 'callback_data' => 'pay:c2c:'.$productId]],
                    ],
                ],
            ]);

            return;
        }

        if ($zp) {
            $this->startZarinpal($bot, $account, $chatId, $productId);

            return;
        }

        $this->startCardToCard($bot, $account, $chatId, $productId);
    }

    public function startZarinpal(TelegramBot $bot, TelegramAccount $account, int $chatId, int $productId): void
    {
        $client = $this->clients->forBot($bot);
        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            $client->sendMessage($chatId, 'محصول یافت نشد.');

            return;
        }

        try {
            $result = $this->checkout->startZarinpalCheckout($account, $product, $this->couponFromContext($account));
        } catch (ValidationException $e) {
            $client->sendMessage($chatId, (string) (collect($e->errors())->flatten()->first() ?: 'امکان شروع پرداخت وجود ندارد.'));

            return;
        } catch (PaymentException $e) {
            $client->sendMessage($chatId, $e->getMessage() ?: 'درگاه پرداخت زرین‌پال آماده نیست.');

            return;
        } catch (Throwable) {
            $client->sendMessage($chatId, 'شروع پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.');

            return;
        }

        $amount = number_format((int) $result['amount']);
        $client->sendMessage(
            $chatId,
            "سفارش #{$result['order_id']}\n{$product->title}\nمبلغ قابل پرداخت: {$amount} تومان\n\nبرای پرداخت، دکمه زیر را بزنید.",
            TelegramSiteUrl::linkMarkup($result['payment_url'], '💳 پرداخت آنلاین'),
        );
    }

    public function startCardToCard(TelegramBot $bot, TelegramAccount $account, int $chatId, int $productId): void
    {
        $client = $this->clients->forBot($bot);
        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            $client->sendMessage($chatId, 'محصول یافت نشد.');

            return;
        }

        try {
            $result = $this->checkout->startCardToCardCheckout($account, $product, $this->couponFromContext($account));
        } catch (ValidationException $e) {
            $client->sendMessage($chatId, (string) (collect($e->errors())->flatten()->first() ?: 'امکان ثبت سفارش وجود ندارد.'));

            return;
        } catch (Throwable) {
            $client->sendMessage($chatId, 'ثبت سفارش کارت‌به‌کارت ناموفق بود.');

            return;
        }

        $amount = number_format((int) $result['amount']);
        $client->sendMessage(
            $chatId,
            "سفارش #{$result['order_id']}\n{$product->title}\nمبلغ: {$amount} تومان\n\n"
            ."🏧 راهنمای کارت‌به‌کارت:\n{$result['instructions']}",
        );
    }

    private function couponFromContext(TelegramAccount $account): ?string
    {
        $coupon = data_get($this->conversations->forAccount($account)->context, 'checkout.coupon');

        return filled($coupon) ? (string) $coupon : null;
    }
}
