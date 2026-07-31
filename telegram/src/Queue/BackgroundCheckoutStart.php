<?php

declare(strict_types=1);

namespace TelegramHost\Queue;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Http\LiveClient;
use TelegramHost\Services\HostCardToCardFlow;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\IranCircuitBreaker;
use TelegramHost\Support\IranSyncFailureException;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/** Drains pending checkout starts after the webhook response. */
final class BackgroundCheckoutStart
{
    private const IRAN_UNAVAILABLE = 'سرور در حال حاضر پاسخگو نیست، لطفا مجددا تلاش کنید';

    public function __construct(
        private readonly PendingCheckoutStart $queue,
        private readonly LiveClient $liveClient,
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly ?HostCardToCardFlow $cardToCard = null,
        private readonly ?AccountSyncCoordinator $accountSync = null,
        private readonly int $maxPerRun = 6,
    ) {}

    public function drain(): void
    {
        if ((new IranCircuitBreaker)->isOpen()) {
            return;
        }

        foreach ($this->queue->popBatch($this->maxPerRun) as $item) {
            $id = (int) ($item['id'] ?? 0);
            $telegramUserId = (int) ($item['telegram_user_id'] ?? 0);
            $chatId = (int) ($item['chat_id'] ?? 0);
            $loadingId = (int) ($item['loading_message_id'] ?? 0);
            $method = (string) ($item['method'] ?? 'zp');
            $productId = (int) ($item['product_id'] ?? 0);

            if ($id <= 0 || $telegramUserId <= 0 || $chatId <= 0 || $productId <= 0) {
                if ($id > 0) {
                    $this->queue->delete($id);
                }

                continue;
            }

            $coupon = isset($item['coupon']) && is_string($item['coupon']) && $item['coupon'] !== ''
                ? $item['coupon']
                : null;

            try {
                $result = $method === 'c2c'
                    ? $this->startC2c($telegramUserId, $chatId, $productId, $coupon)
                    : $this->startZarinpal($telegramUserId, $productId, $coupon);

                if (! empty($result['offline'])) {
                    $this->failItem($id, $chatId, $loadingId, $productId, $method, 'offline');

                    continue;
                }

                if ($method === 'c2c') {
                    $this->handleC2cResult($chatId, $telegramUserId, $loadingId, $productId, $result);
                } else {
                    $this->handleZarinpalResult($chatId, $telegramUserId, $loadingId, $productId, $result);
                }

                $this->queue->delete($id);
            } catch (\Throwable $e) {
                error_log('[telegram-host] checkout start drain: '.$e->getMessage());
                $this->failItem($id, $chatId, $loadingId, $productId, $method, $e->getMessage());
            }
        }

        $this->queue->pruneOld();
    }

    /** @return array<string, mixed> */
    private function startZarinpal(int $telegramUserId, int $productId, ?string $coupon): array
    {
        try {
            return $this->liveClient->checkoutZarinpal($telegramUserId, $productId, $coupon, 10);
        } catch (IranSyncFailureException) {
            return ['ok' => false, 'offline' => true];
        }
    }

    /** @return array<string, mixed> */
    private function startC2c(int $telegramUserId, int $chatId, int $productId, ?string $coupon): array
    {
        try {
            return $this->liveClient->checkoutC2c($telegramUserId, $chatId, $productId, $coupon, 12);
        } catch (IranSyncFailureException) {
            return ['ok' => false, 'offline' => true];
        }
    }

    /** @param array<string, mixed> $result */
    private function handleZarinpalResult(
        int $chatId,
        int $telegramUserId,
        int $loadingId,
        int $productId,
        array $result,
    ): void {
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
        $this->replaceLoadingMessage($chatId, $loadingId, $finalText, [
            'parse_mode' => 'HTML',
            'reply_markup' => [
                'inline_keyboard' => [[InlineButtons::payOnline($url)]],
            ],
        ]);
    }

    /** @param array<string, mixed> $result */
    private function handleC2cResult(
        int $chatId,
        int $telegramUserId,
        int $loadingId,
        int $productId,
        array $result,
    ): void {
        if ($loadingId > 0) {
            $this->api->deleteMessage($chatId, $loadingId);
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

        if ($this->cardToCard === null) {
            $this->api->sendMessage($chatId, self::IRAN_UNAVAILABLE);

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

    private function failItem(
        int $id,
        int $chatId,
        int $loadingId,
        int $productId,
        string $method,
        string $reason,
    ): void {
        $callback = $method === 'c2c' ? 'pay:c2c:'.$productId : 'pay:zp:'.$productId;
        $emoji = $method === 'c2c' ? 'cash' : 'money';
        $this->replaceLoadingMessage($chatId, $loadingId, self::IRAN_UNAVAILABLE, [
            'reply_markup' => [
                'inline_keyboard' => [[InlineButtons::callback('تلاش دوباره', $callback, $emoji, 'success')]],
            ],
        ]);
        $this->queue->markFailed($id, $reason);
    }

    /** @param array<string, mixed> $result */
    private function syncOwnedProductFromCheckout(int $telegramUserId, array $result): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        if (is_array($result['account'] ?? null)) {
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
