<?php

declare(strict_types=1);

namespace TelegramHost\Handlers;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Services\HostCardToCardFlow;
use TelegramHost\Services\HostRegistrationFlow;
use TelegramHost\Services\HostSupportService;
use TelegramHost\Services\MainMenu;
use TelegramHost\Services\MembershipGate;
use TelegramHost\Services\PurchaseFlow;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

final class CallbackQueryHandler
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly ResilientLiveClient $live,
        private readonly ConversationRepository $conversations,
        private readonly AccountCache $accounts,
        private readonly MainMenu $mainMenu,
        private readonly MembershipGate $membership,
        private readonly PurchaseFlow $purchaseFlow,
        private readonly MessageHandler $messageHandler,
        private readonly HostRegistrationFlow $registration,
        private readonly HostSupportService $support,
        private readonly HostCardToCardFlow $cardToCard,
    ) {}

    /** @param array<string, mixed> $callback */
    public function handle(array $callback): void
    {
        $chatId = (int) ($callback['message']['chat']['id'] ?? 0);
        $messageId = (int) ($callback['message']['message_id'] ?? 0);
        $telegramUserId = (int) ($callback['from']['id'] ?? 0);
        $callbackId = (string) ($callback['id'] ?? '');
        $data = (string) ($callback['data'] ?? '');

        if ($telegramUserId <= 0) {
            return;
        }

        if (str_starts_with($data, 'c2c:ok:') || str_starts_with($data, 'c2c:no:')) {
            $this->cardToCard->handleAdminCallback($chatId, $messageId, $telegramUserId, $callbackId, $data);

            return;
        }

        if ($data === 'reg:share_contact') {
            $this->api->answerCallbackQuery(
                $callbackId,
                'برای تأیید شماره، منوی پایین را باز کنید و «ارسال شماره تماس» را بزنید.',
                true,
            );

            return;
        }

        $this->api->answerCallbackQuery($callbackId);

        if (str_starts_with($data, 'reg:')) {
            $this->registration->callback($chatId, $telegramUserId, $data);

            return;
        }

        if (str_starts_with($data, 'support:cat:')) {
            $this->consumeSourceMessage($chatId, $messageId);
            if (! $this->accounts->isVerified($telegramUserId)) {
                $this->registration->showLocalWelcome($chatId, $telegramUserId);

                return;
            }
            $this->handleSupportCategory($chatId, $telegramUserId, substr($data, strlen('support:cat:')));

            return;
        }

        if ($data === 'support:cancel') {
            $this->consumeSourceMessage($chatId, $messageId);
            $this->conversations->set($telegramUserId, 'idle', []);
            if (! $this->accounts->isVerified($telegramUserId)) {
                $this->registration->showLocalWelcome($chatId, $telegramUserId);
            } else {
                $this->api->sendMessage($chatId, 'پشتیبانی لغو شد.', [
                    'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
                ]);
            }

            return;
        }

        if ($data === 'sat:cancel') {
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->api->sendMessage($chatId, 'ثبت درخواست سات لغو شد.', [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);

            return;
        }

        if (str_starts_with($data, 'nav:')) {
            $action = substr($data, 4);
            if (! $this->accounts->isVerified($telegramUserId)) {
                $this->messageHandler->handle([
                    'chat' => ['id' => $chatId],
                    'from' => ['id' => $telegramUserId],
                    'text' => '/start',
                ]);

                return;
            }

            if (! $this->membership->isSatisfied($telegramUserId)) {
                $this->api->sendMessage($chatId, $this->cache->message('membership_required', 'عضویت الزامی است.'), [
                    'reply_markup' => $this->membership->joinPromptMarkup(),
                ]);

                return;
            }

            $label = match ($action) {
                MainMenu::ACTION_COURSES => $this->cache->message('menu_btn_courses', 'دوره‌ها'),
                MainMenu::ACTION_SEMINARS => $this->cache->message('menu_btn_seminars', 'سمینارها'),
                MainMenu::ACTION_SAT => $this->cache->message('menu_btn_sat', 'سات'),
                MainMenu::ACTION_CHANNEL => $this->cache->message('menu_btn_channel', 'کانال مرجع'),
                MainMenu::ACTION_FAMILY => $this->cache->message('menu_btn_family', 'خانواده'),
                MainMenu::ACTION_REFERRAL => $this->cache->message('menu_btn_referral', 'معرفی دوستان'),
                MainMenu::ACTION_SUPPORT => $this->cache->message('menu_btn_support', 'پشتیبانی'),
                MainMenu::ACTION_ACCOUNT => $this->cache->message('menu_btn_account', 'حساب من'),
                default => '',
            };

            if ($label !== '') {
                $this->messageHandler->handle(['chat' => ['id' => $chatId], 'from' => ['id' => $telegramUserId], 'text' => $label]);
            }

            return;
        }

        if (str_starts_with($data, 'buy:skip:')) {
            $this->consumeSourceMessage($chatId, $messageId);
            $productId = (int) substr($data, strlen('buy:skip:'));
            $this->purchaseFlow->proceedToPaymentMethods($chatId, $telegramUserId, $productId, null);

            return;
        }

        if (str_starts_with($data, 'buy:')) {
            $this->consumeSourceMessage($chatId, $messageId);
            $this->handleBuy($chatId, $telegramUserId, (int) substr($data, 4));

            return;
        }

        if (str_starts_with($data, 'pay:zp:')) {
            $this->consumeSourceMessage($chatId, $messageId);
            $this->purchaseFlow->startZarinpal($chatId, $telegramUserId, (int) substr($data, 7));

            return;
        }

        if (str_starts_with($data, 'pay:c2c:')) {
            $this->consumeSourceMessage($chatId, $messageId);
            $this->purchaseFlow->startCardToCard($chatId, $telegramUserId, (int) substr($data, 8));

            return;
        }

        if ($data === 'membership:recheck') {
            if (! $this->accounts->isVerified($telegramUserId)) {
                $this->registration->showLocalWelcome($chatId, $telegramUserId);

                return;
            }
            $this->membership->clearCacheForUser($telegramUserId);
            if ($this->membership->isSatisfied($telegramUserId)) {
                $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('check').' عضویت تأیید شد.', [
                    'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
                ]);
            } else {
                $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('warning').' هنوز در همه کانال‌های اجباری عضو نیستید.', [
                    'reply_markup' => $this->membership->joinPromptMarkup(),
                ]);
            }

            return;
        }
    }

    /** Delete the callback source message so inline buttons cannot be re-clicked. */
    private function consumeSourceMessage(int $chatId, int $messageId): void
    {
        if ($chatId === 0 || $messageId <= 0) {
            return;
        }

        if ($this->api->deleteMessage($chatId, $messageId)) {
            return;
        }

        $this->api->editMessageReplyMarkup($chatId, $messageId, ['inline_keyboard' => []]);
    }

    private function handleSupportCategory(int $chatId, int $telegramUserId, string $category): void
    {
        $category = trim($category);
        if (! $this->cache->isKnownSupportCategory($category)) {
            $category = 'other';
        }

        // Entirely local — no Iran prepare call.
        $this->support->prepare($telegramUserId, $category);
        $this->api->sendMessage($chatId, $this->cache->message(
            'support_write_prompt',
            'پیام پشتیبانی خود را بنویسید (متن یا رسانه). برای انصراف «لغو» بفرستید.',
        ), [
            'reply_markup' => [
                'inline_keyboard' => [
                    [InlineButtons::callback('لغو', 'support:cancel', 'cross', 'danger')],
                ],
            ],
        ]);
    }

    private function handleBuy(int $chatId, int $telegramUserId, int $productId): void
    {
        if ($productId <= 0) {
            return;
        }

        if (! $this->accounts->isVerified($telegramUserId)) {
            $this->messageHandler->handle([
                'chat' => ['id' => $chatId],
                'from' => ['id' => $telegramUserId],
                'text' => '/start',
            ]);

            return;
        }

        if ($this->accounts->ownsProduct($telegramUserId, $productId)) {
            $present = $this->resolveOwnedPresent($chatId, $telegramUserId, $productId);
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

            $this->api->sendMessage($chatId, $this->cache->message(
                'account_snapshot_pending',
                'جزئیات دسترسی دوره در حال همگام‌سازی است. چند دقیقه بعد دوباره «خرید» را بزنید.',
            ));

            return;
        }

        $product = $this->cache->findProduct($productId);
        if ($product === null) {
            $this->api->sendMessage($chatId, 'این محصول در تلگرام موجود نیست.');

            return;
        }

        $matchedSeminar = null;
        $closedStatus = null;
        foreach ($this->cache->seminars() as $seminar) {
            if ((int) ($seminar['product_id'] ?? 0) !== $productId) {
                continue;
            }
            $matchedSeminar = $seminar;
            if (! empty($seminar['is_ended'])) {
                $closedStatus = 'برگزار شده';
            } else {
                $capacityHint = $seminar['capacity_hint'] ?? null;
                $isFull = ! empty($seminar['is_full'])
                    || ($capacityHint !== null && $capacityHint !== '' && (int) $capacityHint <= 0);
                if ($isFull) {
                    $closedStatus = 'تکمیل ظرفیت شده';
                }
            }
            break;
        }
        if ($closedStatus !== null) {
            $title = (string) ($product['title'] ?? 'سمینار');
            $options = [];
            $slug = trim((string) ($matchedSeminar['slug'] ?? ''));
            if ($closedStatus === 'برگزار شده' && $slug !== '') {
                $base = rtrim($this->cache->siteUrl('home', 'https://rostami.app'), '/');
                $options['reply_markup'] = [
                    'inline_keyboard' => [[
                        InlineButtons::url('مشاهده صفحه سمینار', $base.'/seminars/'.ltrim($slug, '/'), 'globe', 'primary'),
                    ]],
                ];
            }
            $this->api->sendMessage(
                $chatId,
                "⛔ سمینار «{$title}» {$closedStatus}.\n\nمنتظر سمینارهای آینده باشید.",
                $options,
            );

            return;
        }

        $title = (string) ($product['title'] ?? 'محصول');
        $base = (int) ($product['price'] ?? 0);
        $sale = isset($product['sale_price']) && $product['sale_price'] !== null && $product['sale_price'] !== ''
            ? (int) $product['sale_price']
            : null;

        // Reference channel: apply local seminar max-discount to the displayed price.
        if ((string) ($product['product_type'] ?? '') === 'reference_channel') {
            $seminarDiscount = $this->accounts->maxReferenceDiscount($telegramUserId, $this->cache);
            if ($seminarDiscount > 0) {
                $sale = max(0, $base - $seminarDiscount);
            }
        }

        $this->purchaseFlow->promptDiscountCode($chatId, $telegramUserId, $productId, $title, $base, $sale);
    }

    /**
     * Local MySQL first (owned_presents push). Live Iran only if cache miss —
     * keeps buy-owned path fast under load. Courses/seminars strip stale L2 gates.
     *
     * @return array<string, mixed>|null
     */
    private function resolveOwnedPresent(int $chatId, int $telegramUserId, int $productId): ?array
    {
        $present = null;
        $cached = $this->accounts->ownedPresent($telegramUserId, $productId);
        if ($cached !== null && isset($cached['text']) && trim((string) $cached['text']) !== '') {
            $present = $cached;
        }

        if ($present === null) {
            $live = $this->live->productPresent($chatId, $telegramUserId, $productId);
            if (empty($live['offline']) && isset($live['text']) && trim((string) $live['text']) !== '') {
                $present = [
                    'text' => (string) $live['text'],
                    'options' => (array) ($live['options'] ?? []),
                    'photo' => (string) ($live['photo'] ?? ''),
                ];
            }
        }

        if ($present === null) {
            return null;
        }

        $product = $this->cache->findProduct($productId);
        $isReference = is_array($product)
            && (string) ($product['product_type'] ?? '') === 'reference_channel';
        $isSeminar = is_array($product)
            && (
                (string) ($product['product_type'] ?? '') === 'seminar'
                || $this->cacheHasSeminarProduct($productId)
            );

        if ($isSeminar) {
            $present = $this->stripSpotPlayerPendingFromPresent($present);
        }

        return $isReference ? $present : $this->stripIdentityGateFromPresent($present);
    }

    private function cacheHasSeminarProduct(int $productId): bool
    {
        foreach ($this->cache->seminars() as $seminar) {
            if ((int) ($seminar['product_id'] ?? 0) === $productId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $present
     * @return array<string, mixed>
     */
    private function stripSpotPlayerPendingFromPresent(array $present): array
    {
        $text = (string) ($present['text'] ?? '');
        $lines = preg_split("/\r\n|\n|\r/", $text) ?: [];
        $kept = [];
        foreach ($lines as $line) {
            $plain = strip_tags((string) $line);
            if (str_contains($plain, 'کلید اسپات‌پلیر هنوز آماده نیست')) {
                continue;
            }
            $kept[] = $line;
        }
        $present['text'] = trim((string) preg_replace("/\n{3,}/", "\n\n", implode("\n", $kept)));

        return $present;
    }

    /**
     * @param  array<string, mixed>  $present
     * @return array<string, mixed>
     */
    private function stripIdentityGateFromPresent(array $present): array
    {
        $text = (string) ($present['text'] ?? '');
        $lines = preg_split("/\r\n|\n|\r/", $text) ?: [];
        $kept = [];
        foreach ($lines as $line) {
            $plain = strip_tags((string) $line);
            if (str_contains($plain, 'احراز هویت سطح ۲')) {
                continue;
            }
            $kept[] = $line;
        }
        $present['text'] = trim((string) preg_replace("/\n{3,}/", "\n\n", implode("\n", $kept)));

        $options = (array) ($present['options'] ?? []);
        $markup = $options['reply_markup'] ?? null;
        if (! is_array($markup) || ! isset($markup['inline_keyboard']) || ! is_array($markup['inline_keyboard'])) {
            return $present;
        }

        $rows = [];
        foreach ($markup['inline_keyboard'] as $row) {
            if (! is_array($row)) {
                continue;
            }
            $buttons = [];
            foreach ($row as $button) {
                if (! is_array($button)) {
                    continue;
                }
                $label = strip_tags((string) ($button['text'] ?? ''));
                if (str_contains($label, 'احراز هویت سطح ۲')) {
                    continue;
                }
                $buttons[] = $button;
            }
            if ($buttons !== []) {
                $rows[] = $buttons;
            }
        }

        if ($rows === []) {
            unset($options['reply_markup']);
        } else {
            $options['reply_markup'] = ['inline_keyboard' => $rows];
        }
        $present['options'] = $options;

        return $present;
    }
}
