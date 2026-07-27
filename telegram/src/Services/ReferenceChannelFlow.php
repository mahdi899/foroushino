<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * «کانال مرجع» funnel:
 * description → seminar max-discount pricing → pay → identity → destination invite.
 */
final class ReferenceChannelFlow
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly PurchaseFlow $purchaseFlow,
        private readonly string $siteBaseUrl,
    ) {}

    public function open(int $chatId, int $telegramUserId): void
    {
        $product = $this->cache->findReferenceChannelProduct();

        if ($product !== null && $this->accounts->ownsProduct($telegramUserId, (int) $product['id'])) {
            $this->openOwned($chatId, $telegramUserId, (int) $product['id']);

            return;
        }

        $this->sendDescriptionAndJoin($chatId);
        $this->sendPricingThenPay($chatId, $telegramUserId, $product);
    }

    private function openOwned(int $chatId, int $telegramUserId, int $productId): void
    {
        if ($this->accounts->hasIdentityLevel2($telegramUserId)) {
            $present = $this->accounts->ownedPresent($telegramUserId, $productId);
            if ($present !== null && isset($present['text'])) {
                $text = (string) $present['text'];
                $options = (array) ($present['options'] ?? []);
                $photo = (string) ($present['photo'] ?? '');
                if ($photo !== '') {
                    $this->api->sendPhoto($chatId, $photo, $text, $options);
                } else {
                    $this->api->sendMessage($chatId, $text, $options);
                }

                return;
            }

            $this->api->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('check').' دسترسی کانال مرجع فعال است. برای عضویت در گروه پشتیبانی، «حساب من» را باز کنید.',
            );

            return;
        }

        $identityUrl = $this->cache->siteUrl('identity', $this->siteBaseUrl.'/panel/identity-verification');
        $text = $this->cache->message(
            'reference_channel_need_identity',
            TelegramCustomEmoji::tag('lock')." <b>احراز هویت لازم است</b>\n\n"
            .'پرداخت شما ثبت شده. برای دریافت لینک گروه مرجع، احراز هویت سطح ۲ را کامل کنید.',
        );

        $keyboard = [];
        if ($identityUrl !== '') {
            $keyboard[] = [InlineButtons::url('احراز هویت سطح ۲', $identityUrl, 'lock', 'primary')];
        }

        $this->api->sendMessage($chatId, $text, array_filter([
            'parse_mode' => 'HTML',
            'reply_markup' => $keyboard !== [] ? ['inline_keyboard' => $keyboard] : null,
        ]));
    }

    private function sendDescriptionAndJoin(int $chatId): void
    {
        $title = $this->cache->message('__reference_channel_title', 'کانال مرجع آکادمی بهرام');
        $text = $this->cache->message(
            'reference_channel_description',
            TelegramCustomEmoji::tag('channel').' <b>'.htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')."</b>\n\n"
            .'با خرید کانال مرجع به گروه اختصاصی منابع دسترسی پیدا می‌کنید. '
            .'پس از پرداخت، احراز هویت سطح ۲ و سپس عضویت در گروه لازم است.',
        );

        $joinUrl = $this->resolveJoinUrl();
        $joinLabel = $this->cache->message('reference_channel_join_btn', 'عضویت در کانال عمومی');

        $keyboard = [];
        if ($joinUrl !== '') {
            $keyboard[] = [InlineButtons::url($joinLabel, $joinUrl, 'channel', 'primary')];
        }

        $this->api->sendMessage($chatId, $text, array_filter([
            'parse_mode' => 'HTML',
            'reply_markup' => $keyboard !== [] ? ['inline_keyboard' => $keyboard] : null,
        ]));
    }

    /** @param array<string, mixed>|null $product */
    private function sendPricingThenPay(int $chatId, int $telegramUserId, ?array $product): void
    {
        if ($product === null) {
            $this->api->sendMessage(
                $chatId,
                $this->cache->message('purchase_catalog_empty', 'هنوز کانال مرجعی برای خرید فعال نیست.'),
            );

            return;
        }

        $productId = (int) $product['id'];
        $listPrice = (int) ($product['price'] ?? 0);
        $discount = $this->accounts->maxReferenceDiscount($telegramUserId, $this->cache);
        $finalPrice = max(0, $listPrice - $discount);

        if ($discount > 0) {
            $priceText = $this->cache->message(
                'reference_channel_price_seminar',
                TelegramCustomEmoji::tag('gift')." <b>چون در سمینار حضور داشتید</b>\n\n"
                .TelegramCustomEmoji::tag('money').' قیمت: <s>'.number_format($listPrice).' تومان</s>'."\n"
                .TelegramCustomEmoji::tag('fire').' با تخفیف سمینار: <b>'.number_format($finalPrice).' تومان</b>',
            );
        } else {
            $priceText = $this->cache->message(
                'reference_channel_price_full',
                TelegramCustomEmoji::tag('cart')." <b>دسترسی به کانال مرجع</b>\n\n"
                .TelegramCustomEmoji::tag('money').' قیمت: <b>'.number_format($listPrice).' تومان</b>'."\n\n"
                .'اگر در سمینار شرکت کرده باشید، تخفیف ویژه روی حسابتان اعمال می‌شود.',
            );
        }

        $this->api->sendMessage($chatId, $priceText, ['parse_mode' => 'HTML']);
        $this->purchaseFlow->proceedToPaymentMethods($chatId, $telegramUserId, $productId, null);
    }

    private function resolveJoinUrl(): string
    {
        $configured = trim($this->cache->siteUrl('reference_channel', ''));
        if ($configured !== '') {
            return $configured;
        }

        foreach ($this->cache->requiredChats() as $chat) {
            $url = trim((string) ($chat['invite_link'] ?? ''));
            if ($url !== '') {
                return $url;
            }
        }

        return '';
    }
}
