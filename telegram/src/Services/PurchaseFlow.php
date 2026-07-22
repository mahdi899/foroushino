<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\LiveClient;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

final class PurchaseFlow
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly LiveClient $live,
        private readonly SyncCache $cache,
        private readonly ConversationRepository $conversations,
        private readonly MainMenu $mainMenu,
    ) {}

    public function applyDiscountCode(int $chatId, int $telegramUserId, string $code): void
    {
        $conversation = $this->conversations->get($telegramUserId);
        $productId = (int) ($conversation['context']['checkout']['product_id'] ?? 0);

        if ($productId <= 0) {
            $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('warning').' محصول یافت نشد. دوباره از منو خرید کنید.');
            $this->conversations->set($telegramUserId, 'idle');

            return;
        }

        if (in_array(trim($code), ['لغو', '/cancel', '-'], true)) {
            $this->conversations->set($telegramUserId, 'idle');
            $this->api->sendMessage($chatId, 'خرید لغو شد.', [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);

            return;
        }

        $preview = $this->live->discountPreview($telegramUserId, $productId, $code);
        if (empty($preview['ok'])) {
            $this->api->sendMessage($chatId, ((string) ($preview['message'] ?? 'کد تخفیف معتبر نیست.'))."\n\nدوباره کد را بفرستید یا «بدون کد تخفیف» را بزنید.");

            return;
        }

        $coupon = (string) $preview['coupon'];
        $this->conversations->set($telegramUserId, 'idle', [
            'checkout' => ['product_id' => $productId, 'coupon' => $coupon],
        ]);

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('check').' کد «'.$coupon.'» اعمال شد.'
            ."\n".TelegramCustomEmoji::tag('money').' تخفیف: '.number_format((int) $preview['coupon_discount']).' تومان'
            ."\n".TelegramCustomEmoji::tag('fire').' مبلغ نهایی: '.number_format((int) $preview['final_amount']).' تومان',
        );

        $this->proceedToPaymentMethods($chatId, $telegramUserId, $productId, $coupon);
    }

    public function proceedToPaymentMethods(int $chatId, int $telegramUserId, int $productId, ?string $coupon): void
    {
        $this->conversations->set($telegramUserId, 'idle', [
            'checkout' => ['product_id' => $productId, 'coupon' => $coupon],
        ]);

        $zp = $this->cache->checkoutZarinpalEnabled();
        $c2c = $this->cache->checkoutC2cEnabled();

        if (! $zp && ! $c2c) {
            $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('warning').' پرداخت آنلاین و کارت‌به‌کارت هر دو غیرفعال‌اند. با پشتیبانی تماس بگیرید.');

            return;
        }

        if ($zp && $c2c) {
            $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('point_up').' روش پرداخت را انتخاب کنید:', [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [InlineButtons::callback('زرین‌پال (آنلاین)', 'pay:zp:'.$productId, 'money', 'success')],
                        [InlineButtons::callback('کارت به کارت', 'pay:c2c:'.$productId, 'cash')],
                    ],
                ],
            ]);

            return;
        }

        if ($zp) {
            $this->startZarinpal($chatId, $telegramUserId, $productId);

            return;
        }

        $this->startCardToCard($chatId, $telegramUserId, $productId);
    }

    public function startZarinpal(int $chatId, int $telegramUserId, int $productId): void
    {
        $coupon = $this->couponFromContext($telegramUserId);
        $result = $this->live->checkoutZarinpal($telegramUserId, $productId, $coupon);

        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'شروع پرداخت ناموفق بود.'));

            return;
        }

        $amount = number_format((int) ($result['amount'] ?? 0));
        $orderId = (int) ($result['order_id'] ?? 0);
        $url = (string) ($result['payment_url'] ?? '');

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('cart')." سفارش #{$orderId}\n"
            .TelegramCustomEmoji::tag('money')." مبلغ قابل پرداخت: {$amount} تومان\n\n"
            .TelegramCustomEmoji::tag('point_up').' برای پرداخت، دکمه زیر را بزنید.',
            [
                'reply_markup' => [
                    'inline_keyboard' => [[InlineButtons::payOnline($url)]],
                ],
            ],
        );
    }

    public function startCardToCard(int $chatId, int $telegramUserId, int $productId): void
    {
        $coupon = $this->couponFromContext($telegramUserId);
        $result = $this->live->checkoutC2c($telegramUserId, $chatId, $productId, $coupon);

        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'ثبت سفارش کارت‌به‌کارت ناموفق بود.'));

            return;
        }

        if (! empty($result['state'])) {
            $this->conversations->set($telegramUserId, (string) $result['state'], (array) ($result['context'] ?? []));
        }

        if (empty($result['server_sent_prompt'])) {
            $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('notes').' رسید پرداخت را ارسال کنید. برای انصراف «لغو» بفرستید.');
        }
    }

    public function promptDiscountCode(int $chatId, int $telegramUserId, int $productId, string $title, int $basePrice, ?int $salePrice): void
    {
        $this->conversations->set($telegramUserId, 'waiting_for_discount_code', [
            'checkout' => ['product_id' => $productId, 'coupon' => null],
        ]);

        $priceBlock = ($salePrice !== null && $salePrice > 0 && $salePrice < $basePrice)
            ? TelegramCustomEmoji::tag('money').' قیمت اصلی: '.number_format($basePrice)." تومان\n"
                .TelegramCustomEmoji::tag('fire').' قیمت با تخفیف: '.number_format($salePrice).' تومان'
            : TelegramCustomEmoji::tag('money').' مبلغ: '.number_format($salePrice ?: $basePrice).' تومان';

        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('cart')." <b>{$safeTitle}</b>\n{$priceBlock}\n\n"
            .TelegramCustomEmoji::tag('gift').' اگر کد تخفیف دارید همین‌جا بفرستید.',
            [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [InlineButtons::skipDiscount($productId)],
                    ],
                ],
            ],
        );
    }

    private function couponFromContext(int $telegramUserId): ?string
    {
        $conversation = $this->conversations->get($telegramUserId);
        $coupon = $conversation['context']['checkout']['coupon'] ?? null;

        return is_string($coupon) && $coupon !== '' ? $coupon : null;
    }
}
