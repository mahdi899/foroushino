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
 * photo + description + buy → discount → pay → identity → destination invite.
 */
final class ReferenceChannelFlow
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly string $siteBaseUrl,
    ) {}

    public function open(int $chatId, int $telegramUserId): void
    {
        $product = $this->cache->findReferenceChannelProduct();

        if ($product !== null && $this->accounts->ownsProduct($telegramUserId, (int) $product['id'])) {
            $this->openOwned($chatId, $telegramUserId, (int) $product['id']);

            return;
        }

        $this->sendProductOffer($chatId, $product);
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

    /** @param array<string, mixed>|null $product */
    private function sendProductOffer(int $chatId, ?array $product): void
    {
        if ($product === null) {
            $this->api->sendMessage(
                $chatId,
                $this->cache->message(
                    'reference_channel_catalog_empty',
                    'هنوز کانال مرجعی برای خرید فعال نیست.',
                ),
            );

            return;
        }

        $productId = (int) $product['id'];
        $title = trim((string) ($product['title'] ?? $this->cache->message('__reference_channel_title', 'کانال مرجع آکادمی بهرام')));
        $safeTitle = htmlspecialchars($title !== '' ? $title : 'کانال مرجع آکادمی بهرام', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        // Prefer the editable bot message; fall back to product description from admin.
        $customCaption = trim($this->cache->message('reference_channel_description', ''));
        $productDescription = trim($this->cache->message('__reference_channel_product_description', ''));
        if ($customCaption !== '') {
            $caption = $customCaption;
        } else {
            $caption = TelegramCustomEmoji::tag('channel').' <b>'.$safeTitle."</b>\n\n"
                .($productDescription !== ''
                    ? htmlspecialchars($productDescription, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')
                    : 'با خرید کانال مرجع به گروه اختصاصی منابع دسترسی پیدا می‌کنید.');
        }

        $keyboard = [
            [InlineButtons::buy($productId, $this->cache->message('reference_channel_buy_btn', 'خرید'))],
        ];

        $options = [
            'parse_mode' => 'HTML',
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ];

        $photo = trim((string) ($product['photo'] ?? $product['photo_url'] ?? ''));
        if ($photo !== '') {
            $this->api->sendPhoto($chatId, $photo, $caption, $options);

            return;
        }

        $this->api->sendMessage($chatId, $caption, $options);
    }
}
