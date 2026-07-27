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
 * description + join → seminar-aware pricing → pay → identity → destinations.
 */
final class ReferenceChannelFlow
{
    public const COURSE_SLUG = 'campaign-writing';

    public const LIST_PRICE = 30_000_000;

    public const SEMINAR_PRICE = 200_000;

    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly PurchaseFlow $purchaseFlow,
        private readonly string $siteBaseUrl,
    ) {}

    public function open(int $chatId, int $telegramUserId): void
    {
        $course = $this->cache->findProductBySlug(self::COURSE_SLUG);

        if ($course !== null && $this->accounts->ownsProduct($telegramUserId, (int) $course['id'])) {
            $this->openOwned($chatId, $telegramUserId, (int) $course['id']);

            return;
        }

        $this->sendDescriptionAndJoin($chatId);
        $this->sendPricingThenPay($chatId, $telegramUserId, $course);
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
                TelegramCustomEmoji::tag('check').' دسترسی دوره شما فعال است. لینک مقاصد از حساب همگام می‌شود؛ چند لحظه بعد دوباره «کانال مرجع» را بزنید.',
            );

            return;
        }

        $identityUrl = $this->cache->siteUrl('identity', $this->siteBaseUrl.'/identity');
        $text = $this->cache->message(
            'reference_channel_need_identity',
            TelegramCustomEmoji::tag('lock')." <b>احراز هویت لازم است</b>\n\n"
            .'پرداخت شما ثبت شده. برای دریافت لینک مقاصد (گروه‌ها/کانال‌های اختصاصی)، احراز هویت سطح ۲ را کامل کنید.',
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
        $text = $this->cache->message(
            'reference_channel_description',
            TelegramCustomEmoji::tag('channel')." <b>کانال مرجع آکادمی بهرام</b>\n\n"
            .'اینجا فضای اصلی محتوا، اطلاع‌رسانی‌ها و مسیر یادگیری جمع است. '
            .'با عضویت در کانال مرجع از آپدیت‌ها و فرصت‌های ویژه جا نمی‌مانی.',
        );

        $joinUrl = $this->resolveJoinUrl();
        $joinLabel = $this->cache->message('reference_channel_join_btn', 'عضویت در کانال مرجع');

        $keyboard = [];
        if ($joinUrl !== '') {
            $keyboard[] = [InlineButtons::url($joinLabel, $joinUrl, 'channel', 'primary')];
        }

        $this->api->sendMessage($chatId, $text, array_filter([
            'parse_mode' => 'HTML',
            'reply_markup' => $keyboard !== [] ? ['inline_keyboard' => $keyboard] : null,
        ]));
    }

    /** @param array<string, mixed>|null $course */
    private function sendPricingThenPay(int $chatId, int $telegramUserId, ?array $course): void
    {
        if ($course === null) {
            $this->api->sendMessage(
                $chatId,
                $this->cache->message('purchase_catalog_empty', 'هنوز دوره‌ای برای خرید فعال نیست.'),
            );

            return;
        }

        $productId = (int) $course['id'];
        $hasSeminar = $this->accounts->hasSeminarOnAccount($telegramUserId, $this->cache);
        $listPrice = self::LIST_PRICE;
        $seminarPrice = self::SEMINAR_PRICE;

        if ($hasSeminar) {
            $priceText = $this->cache->message(
                'reference_channel_price_seminar',
                TelegramCustomEmoji::tag('gift')." <b>چون در سمینار حضور داشتید</b>\n\n"
                .TelegramCustomEmoji::tag('money').' قیمت دوره: <s>'.number_format($listPrice).' تومان</s>'."\n"
                .TelegramCustomEmoji::tag('fire').' با آف سمینار: <b>'.number_format($seminarPrice).' تومان</b>',
            );
        } else {
            $priceText = $this->cache->message(
                'reference_channel_price_full',
                TelegramCustomEmoji::tag('cart')." <b>دسترسی به دوره و کانال مرجع</b>\n\n"
                .TelegramCustomEmoji::tag('money').' قیمت: <b>'.number_format($listPrice).' تومان</b>'."\n\n"
                .'اگر در سمینار حضور داشته باشید، آف ویژه روی حسابتان اعمال می‌شود.',
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
