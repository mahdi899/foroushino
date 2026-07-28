<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * «کانال مرجع» funnel.
 * Caption order: title → description → price (selling) → short ownership footer (owned).
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
            $this->openOwned($chatId, $telegramUserId, (int) $product['id'], $product);

            return;
        }

        $this->sendProductOffer($chatId, $telegramUserId, $product);
    }

    /**
     * @param  array<string, mixed>  $product
     */
    private function openOwned(int $chatId, int $telegramUserId, int $productId, array $product): void
    {
        $marketing = $this->buildCaption($product, $telegramUserId, includePrice: false);
        $photo = $this->resolvePhoto($product, null);

        if (! $this->accounts->hasIdentityLevel2($telegramUserId)) {
            $identityUrl = $this->cache->siteUrl('identity', $this->siteBaseUrl.'/panel/identity-verification');
            $identityText = $this->cache->message(
                'reference_channel_need_identity',
                TelegramCustomEmoji::tag('lock').' احراز هویت سطح ۲ لازم است تا لینک عضویت گروه مرجع فعال شود.',
            );
            $identityText = $this->shortStatusOnly($identityText, TelegramCustomEmoji::tag('lock').' احراز هویت سطح ۲ لازم است تا لینک عضویت گروه مرجع فعال شود.');

            $keyboard = [];
            if ($identityUrl !== '') {
                $keyboard[] = [InlineButtons::url('احراز هویت سطح ۲', $identityUrl, 'lock', 'primary')];
            }

            $caption = $this->appendFooter($marketing, $identityText);
            $this->deliverCaption($chatId, $caption, $photo, array_filter([
                'parse_mode' => 'HTML',
                'reply_markup' => $keyboard !== [] ? ['inline_keyboard' => $keyboard] : null,
            ]));

            return;
        }

        $present = $this->accounts->ownedPresent($telegramUserId, $productId);
        $statusText = '';
        $options = ['parse_mode' => 'HTML'];

        if ($present !== null) {
            $statusText = $this->shortStatusOnly(
                trim((string) ($present['text'] ?? '')),
                TelegramCustomEmoji::tag('check').' شما عضو گروه مرجع هستید.',
            );
            $presentOptions = (array) ($present['options'] ?? []);
            if ($presentOptions !== []) {
                $options = array_merge($options, $presentOptions);
            }
            $photo = $this->resolvePhoto($product, $present) ?: $photo;
        } else {
            $statusText = TelegramCustomEmoji::tag('check').' شما عضو گروه مرجع هستید.';
        }

        $caption = $this->appendFooter($marketing, $statusText);
        $this->deliverCaption($chatId, $caption, $photo, $options);
    }

    /** @param array<string, mixed>|null $product */
    private function sendProductOffer(int $chatId, int $telegramUserId, ?array $product): void
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
        $caption = $this->buildCaption($product, $telegramUserId, includePrice: true);

        $keyboard = [
            [InlineButtons::buy($productId, $this->cache->message('reference_channel_buy_btn', 'خرید'))],
        ];

        $options = [
            'parse_mode' => 'HTML',
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ];

        $this->deliverCaption($chatId, $caption, $this->resolvePhoto($product, null), $options);
    }

    /**
     * @param  array<string, mixed>|null  $product
     */
    private function buildCaption(?array $product, int $telegramUserId, bool $includePrice): string
    {
        $title = trim((string) ($product['title'] ?? $this->cache->message('__reference_channel_title', 'کانال مرجع')));
        if ($title === '') {
            $title = 'کانال مرجع';
        }
        $safeTitle = htmlspecialchars($title, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $description = $this->resolveDescription($product);
        $blocks = [
            TelegramCustomEmoji::tag('channel').' <b>'.$safeTitle.'</b>',
            $description,
        ];

        if ($includePrice && $product !== null) {
            $blocks[] = $this->buildPriceBlock($product, $telegramUserId);
        }

        return implode("\n\n", array_values(array_filter($blocks, static fn (string $b): bool => trim($b) !== '')));
    }

    /** @param  array<string, mixed>|null  $product */
    private function resolveDescription(?array $product): string
    {
        $fromProduct = $this->plainText((string) ($product['description'] ?? $this->cache->message('__reference_channel_product_description', '')));
        if ($this->isUsableDescription($fromProduct)) {
            return htmlspecialchars($fromProduct, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        }

        $fromBot = trim($this->cache->message('reference_channel_description', ''));
        $fromBot = preg_replace('/^(?:<tg-emoji[^>]*>.*?<\/tg-emoji>\s*)?<b>[^<]+<\/b>\s*/u', '', $fromBot) ?? $fromBot;
        $fromBot = preg_replace('/^📣\s*<b>[^<]+<\/b>\s*/u', '', $fromBot) ?? $fromBot;
        $fromBot = trim($fromBot);
        if ($fromBot !== '') {
            return $fromBot;
        }

        return 'با عضویت در کانال مرجع از آپدیت‌ها و فرصت‌های ویژه جا نمی‌مانید.';
    }

    /** @param  array<string, mixed>  $product */
    private function buildPriceBlock(array $product, int $telegramUserId): string
    {
        $listPrice = (int) ($product['price'] ?? 0);
        if ($listPrice <= 0) {
            $listPrice = (int) $this->cache->message('__reference_channel_price', '0');
        }

        $discount = $this->accounts->maxReferenceDiscount($telegramUserId, $this->cache);
        $finalPrice = max(0, $listPrice - $discount);

        if ($discount > 0 && $finalPrice < $listPrice) {
            return TelegramCustomEmoji::tag('gift').' <b>چون در سمینار حضور داشتید</b>'."\n"
                .TelegramCustomEmoji::tag('money').' قیمت: <s>'.number_format($listPrice).' تومان</s>'."\n"
                .TelegramCustomEmoji::tag('fire').' با تخفیف سمینار: <b>'.number_format($finalPrice).' تومان</b>';
        }

        return TelegramCustomEmoji::tag('cart').' <b>قیمت دسترسی</b>'."\n"
            .TelegramCustomEmoji::tag('money').' <b>'.number_format($listPrice).' تومان</b>'."\n"
            .'اگر در سمینار شرکت کرده باشید، تخفیف ویژه روی حسابتان اعمال می‌شود.';
    }

    private function appendFooter(string $marketing, string $status): string
    {
        $marketing = trim($marketing);
        $status = trim($status);
        if ($marketing === '') {
            return $status;
        }
        if ($status === '') {
            return $marketing;
        }

        return $marketing."\n\n".$status;
    }

    /**
     * Prefer a single short ownership/KYC line; drop legacy multi-section present bodies.
     */
    private function shortStatusOnly(string $status, string $fallback): string
    {
        $status = trim($status);
        if ($status === '') {
            return $fallback;
        }

        if (preg_match('/شما عضو گروه مرجع هستید/u', $status)) {
            return TelegramCustomEmoji::tag('check').' شما عضو گروه مرجع هستید.';
        }

        if (preg_match('/احراز هویت/u', $status)) {
            return TelegramCustomEmoji::tag('lock').' احراز هویت سطح ۲ لازم است تا لینک عضویت گروه مرجع فعال شود.';
        }

        // Keep first non-empty line only — ownership footer should stay short.
        foreach (preg_split("/\R/u", $status) ?: [] as $line) {
            $line = trim((string) $line);
            if ($line !== '' && ! str_contains($line, '────────')) {
                return $line;
            }
        }

        return $fallback;
    }

    private function plainText(string $value): string
    {
        $text = html_entity_decode(strip_tags($value), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace("/[ \t]+/u", ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/u", "\n\n", $text) ?? $text;

        return trim($text);
    }

    private function isUsableDescription(string $text): bool
    {
        if ($text === '' || mb_strlen($text) < 8) {
            return false;
        }

        $normalized = mb_strtolower($text);

        return ! in_array($normalized, ['/start', 'start', '-', 'null', 'n/a'], true);
    }

    /**
     * @param  array<string, mixed>|null  $product
     * @param  array<string, mixed>|null  $present
     */
    private function resolvePhoto(?array $product, ?array $present): string
    {
        if (is_array($present)) {
            $fromPresent = trim((string) ($present['photo'] ?? ''));
            if ($fromPresent !== '') {
                return $fromPresent;
            }
        }

        if ($product === null) {
            return '';
        }

        return trim((string) ($product['photo'] ?? $product['photo_url'] ?? ''));
    }

    /** @param  array<string, mixed>  $options */
    private function deliverCaption(int $chatId, string $caption, string $photo, array $options): void
    {
        if ($photo !== '') {
            $this->api->sendPhoto($chatId, $photo, $caption, $options);

            return;
        }

        $this->api->sendMessage($chatId, $caption, $options);
    }
}
