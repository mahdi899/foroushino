<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Queue\PendingCheckoutRevoke;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

final class PurchaseFlow
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly ResilientLiveClient $live,
        private readonly SyncCache $cache,
        private readonly ConversationRepository $conversations,
        private readonly MainMenu $mainMenu,
        private readonly HostDiscountPreview $discounts,
        private readonly HostCardToCardFlow $cardToCard,
        private readonly ?AccountCache $accounts = null,
        private readonly ?AccountSyncCoordinator $accountSync = null,
        private readonly ?PendingCheckoutRevoke $checkoutRevokeQueue = null,
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

        // Local preview (incl. capacity via uses_reserved) — no Iran / no typing.
        // Iran re-validates authoritatively when starting the payment gateway.
        $preview = $this->discounts->preview($code, $productId);
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
        if ($this->handleAlreadyOwnedLocally($chatId, $telegramUserId, $productId)) {
            return;
        }

        $this->conversations->set($telegramUserId, 'idle', [
            'checkout' => ['product_id' => $productId, 'coupon' => $coupon],
        ]);

        // Bootstrap push from Iran already carries checkout flags; no live Iran hop here.
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
        if ($this->handleAlreadyOwnedLocally($chatId, $telegramUserId, $productId)) {
            return;
        }

        $coupon = $this->couponFromContext($telegramUserId);
        $loading = $this->api->sendMessageResult($chatId, '⏳ در حال آماده‌سازی پرداخت...');
        $loadingId = (int) ($loading['message_id'] ?? 0);

        $result = $this->live->checkoutZarinpal($chatId, $telegramUserId, $productId, $coupon);

        if (! empty($result['offline'])) {
            $this->replaceLoadingMessage($chatId, $loadingId, $this->cache->message(
                'payment_retry_soon',
                'اتصال به سرور پرداخت لحظه‌ای برقرار نشد. با دکمه زیر دوباره تلاش کنید.',
            ), [
                'reply_markup' => [
                    'inline_keyboard' => [[InlineButtons::callback('تلاش دوباره', 'pay:zp:'.$productId, 'money', 'success')]],
                ],
            ]);

            return;
        }

        if (empty($result['ok'])) {
            $this->syncOwnedProductFromCheckout($telegramUserId, $result);
            $message = (string) ($result['message'] ?? 'شروع پرداخت ناموفق بود.');
            if (! empty($result['already_owned'])) {
                $message .= "\n\n".'اطلاعات خرید شما همگام شد. «حساب من» را دوباره بزنید.';
            }
            $this->replaceLoadingMessage($chatId, $loadingId, $message);

            return;
        }

        $amount = number_format((int) ($result['amount'] ?? 0));
        $orderId = (int) ($result['order_id'] ?? 0);
        $url = (string) ($result['payment_url'] ?? '');
        $title = trim((string) ($result['product_title'] ?? ''));
        if ($title === '') {
            $productRow = $this->cache->findProduct($productId);
            $title = (string) ($productRow['title'] ?? 'محصول');
        }
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $finalText = TelegramCustomEmoji::tag('cart')." سفارش #{$orderId}\n"
            ."<b>{$safeTitle}</b>\n"
            .TelegramCustomEmoji::tag('money')." مبلغ قابل پرداخت: {$amount} تومان\n\n"
            .TelegramCustomEmoji::tag('point_up').' برای پرداخت، دکمه زیر را بزنید.';
        $finalOptions = [
            'parse_mode' => 'HTML',
            'reply_markup' => [
                'inline_keyboard' => [[InlineButtons::payOnline($url)]],
            ],
        ];

        if ($loadingId > 0) {
            $this->api->editMessageText($chatId, $loadingId, $finalText, $finalOptions);
        } else {
            $this->api->sendMessage($chatId, $finalText, $finalOptions);
        }
    }

    public function startCardToCard(int $chatId, int $telegramUserId, int $productId): void
    {
        if ($this->handleAlreadyOwnedLocally($chatId, $telegramUserId, $productId)) {
            return;
        }

        $coupon = $this->couponFromContext($telegramUserId);
        $loading = $this->api->sendMessageResult($chatId, '⏳ در حال آماده‌سازی پرداخت کارت‌به‌کارت...');
        $loadingId = (int) ($loading['message_id'] ?? 0);

        $result = $this->live->checkoutC2c($chatId, $telegramUserId, $productId, $coupon);

        if ($loadingId > 0) {
            $this->api->deleteMessage($chatId, $loadingId);
        }

        if (! empty($result['offline'])) {
            $this->api->sendMessage($chatId, $this->cache->message(
                'payment_retry_soon',
                'اتصال به سرور لحظه‌ای برقرار نشد. با دکمه زیر دوباره تلاش کنید.',
            ), [
                'reply_markup' => [
                    'inline_keyboard' => [[InlineButtons::callback('تلاش دوباره', 'pay:c2c:'.$productId, 'cash', 'success')]],
                ],
            ]);

            return;
        }

        if (empty($result['ok'])) {
            $this->syncOwnedProductFromCheckout($telegramUserId, $result);
            $message = (string) ($result['message'] ?? 'ثبت سفارش کارت‌به‌کارت ناموفق بود.');
            if (! empty($result['already_owned'])) {
                $message .= "\n\n".'اطلاعات خرید شما همگام شد. «حساب من» را دوباره بزنید.';
            }
            $this->api->sendMessage($chatId, $message);

            return;
        }

        $orderId = (int) ($result['order_id'] ?? 0);
        $amount = (int) ($result['amount'] ?? 0);
        $title = trim((string) ($result['product_title'] ?? ''));
        if ($title === '') {
            $productRow = $this->cache->findProduct($productId);
            $title = (string) ($productRow['title'] ?? 'محصول');
        }
        $instructions = trim((string) ($result['instructions'] ?? ''));
        if ($instructions === '') {
            $instructions = $this->cache->cardToCardInstructions();
        }
        $ttl = max(1, (int) ($result['ttl_minutes'] ?? 15));

        $this->cardToCard->sendLocalInstructions(
            $chatId,
            $telegramUserId,
            $orderId,
            $title,
            $amount,
            $instructions,
            $ttl,
            $productId,
        );
    }

    public function promptDiscountCode(int $chatId, int $telegramUserId, int $productId, string $title, int $basePrice, ?int $salePrice): void
    {
        $this->enqueueCheckoutRevoke($telegramUserId);
        $this->conversations->set($telegramUserId, 'waiting_for_discount_code', [
            'checkout' => ['product_id' => $productId, 'coupon' => null],
        ]);

        $priceBlock = ($salePrice !== null && $salePrice > 0 && $salePrice < $basePrice)
            ? TelegramCustomEmoji::tag('money').' قیمت اصلی: <s>'.number_format($basePrice).' تومان</s>'."\n"
                .TelegramCustomEmoji::tag('fire').' قیمت با تخفیف: <b>'.number_format($salePrice).' تومان</b>'
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

    /**
     * Local-first ownership guard: if the host cache already knows the user owns
     * this product, never round-trip Iran for checkout — just show the access
     * they already have (or point them at "حساب من" once it's synced).
     */
    private function handleAlreadyOwnedLocally(int $chatId, int $telegramUserId, int $productId): bool
    {
        if ($this->accounts === null || ! $this->accounts->ownsProduct($telegramUserId, $productId)) {
            return false;
        }

        $this->conversations->set($telegramUserId, 'idle');

        $present = $this->accounts->ownedPresent($telegramUserId, $productId);
        if ($present !== null && trim((string) ($present['text'] ?? '')) !== '') {
            $this->api->sendMessage($chatId, (string) $present['text'], (array) ($present['options'] ?? []));

            return true;
        }

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('check').' شما قبلاً این محصول را خریداری کرده‌اید.'
            ."\n\nبرای مشاهده دسترسی، «حساب من» را بزنید.",
            ['reply_markup' => $this->mainMenu->replyMarkup($telegramUserId)],
        );

        return true;
    }

    private function couponFromContext(int $telegramUserId): ?string
    {
        $conversation = $this->conversations->get($telegramUserId);
        $coupon = $conversation['context']['checkout']['coupon'] ?? null;

        return is_string($coupon) && $coupon !== '' ? $coupon : null;
    }

    private function enqueueCheckoutRevoke(int $telegramUserId): void
    {
        if ($telegramUserId <= 0 || $this->checkoutRevokeQueue === null) {
            return;
        }

        $this->checkoutRevokeQueue->enqueue($telegramUserId);
    }

    /** @param array<string, mixed> $result */
    private function syncOwnedProductFromCheckout(int $telegramUserId, array $result): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        if (is_array($result['account'] ?? null) && $this->accounts !== null) {
            try {
                $this->accounts->store($telegramUserId, $result['account']);
            } catch (\Throwable $e) {
                error_log('[telegram-host] checkout account sync: '.$e->getMessage());
            }
        }

        if ($this->accountSync !== null) {
            try {
                $this->accountSync->ensureFresh($telegramUserId, true);
            } catch (\Throwable $e) {
                error_log('[telegram-host] checkout ensureFresh: '.$e->getMessage());
            }
        }
    }

    /** @param array<string, mixed> $options */
    private function replaceLoadingMessage(int $chatId, int $loadingId, string $text, array $options = []): void
    {
        if ($loadingId > 0) {
            $this->api->editMessageText($chatId, $loadingId, $text, $options);

            return;
        }

        $this->api->sendMessage($chatId, $text, $options);
    }
}
