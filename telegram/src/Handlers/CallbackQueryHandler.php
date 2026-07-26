<?php

declare(strict_types=1);

namespace TelegramHost\Handlers;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Services\MainMenu;
use TelegramHost\Services\MembershipGate;
use TelegramHost\Services\PurchaseFlow;
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
    ) {}

    /** @param array<string, mixed> $callback */
    public function handle(array $callback): void
    {
        $chatId = (int) ($callback['message']['chat']['id'] ?? 0);
        $telegramUserId = (int) ($callback['from']['id'] ?? 0);
        $callbackId = (string) ($callback['id'] ?? '');
        $data = (string) ($callback['data'] ?? '');

        if ($telegramUserId <= 0) {
            return;
        }

        $this->api->answerCallbackQuery($callbackId);

        if (str_starts_with($data, 'support:cat:')) {
            $this->handleSupportCategory($chatId, $telegramUserId, substr($data, strlen('support:cat:')));

            return;
        }

        if (str_starts_with($data, 'nav:')) {
            $action = substr($data, 4);
            if (! $this->accounts->isVerified($telegramUserId)) {
                $this->api->answerCallbackQuery($callbackId, 'ابتدا ثبت‌نام را کامل کنید.', true);

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
            $productId = (int) substr($data, strlen('buy:skip:'));
            $this->purchaseFlow->proceedToPaymentMethods($chatId, $telegramUserId, $productId, null);

            return;
        }

        if (str_starts_with($data, 'buy:')) {
            $this->handleBuy($chatId, $telegramUserId, (int) substr($data, 4));

            return;
        }

        if (str_starts_with($data, 'pay:zp:')) {
            $this->purchaseFlow->startZarinpal($chatId, $telegramUserId, (int) substr($data, 7));

            return;
        }

        if (str_starts_with($data, 'pay:c2c:')) {
            $this->purchaseFlow->startCardToCard($chatId, $telegramUserId, (int) substr($data, 8));

            return;
        }

        if ($data === 'membership:recheck') {
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

        if (str_starts_with($data, 'seminar:check:')) {
            $seminarId = (int) substr($data, strlen('seminar:check:'));
            $this->checkSeminarCapacity($chatId, $telegramUserId, $seminarId);
        }
    }

    private function handleSupportCategory(int $chatId, int $telegramUserId, string $category): void
    {
        if (! in_array($category, ['purchase', 'campaign_course', 'sat', 'other'], true)) {
            return;
        }

        $result = $this->live->supportPrepare($chatId, $telegramUserId, $category);
        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'امکان شروع پشتیبانی نیست.'));

            return;
        }

        if (! empty($result['state'])) {
            $this->conversations->set($telegramUserId, (string) $result['state'], (array) ($result['context'] ?? []));
        }

        $this->api->sendMessage($chatId, 'پیام پشتیبانی خود را بنویسید (متن یا رسانه). برای انصراف «لغو» بفرستید.');
    }

    private function handleBuy(int $chatId, int $telegramUserId, int $productId): void
    {
        if ($productId <= 0) {
            return;
        }

        if (! $this->accounts->isVerified($telegramUserId)) {
            $this->api->sendMessage($chatId, 'برای خرید، ابتدا از /start ثبت‌نام را کامل کنید.');

            return;
        }

        if ($this->accounts->ownsProduct($telegramUserId, $productId)) {
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

        $title = (string) ($product['title'] ?? 'محصول');
        $base = (int) ($product['price'] ?? 0);
        $sale = isset($product['sale_price']) ? (int) $product['sale_price'] : null;

        $this->purchaseFlow->promptDiscountCode($chatId, $telegramUserId, $productId, $title, $base, $sale);
    }

    private function checkSeminarCapacity(int $chatId, int $telegramUserId, int $seminarId): void
    {
        $result = $this->live->capacityCheck($chatId, $telegramUserId, $seminarId);
        if (! empty($result['offline'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? ''));

            return;
        }

        if (! empty($result['ok'])) {
            if (! empty($result['is_full'])) {
                $this->api->sendMessage($chatId, 'ظرفیت این سمینار تکمیل شده است.');

                return;
            }

            $remaining = (int) ($result['remaining_seats'] ?? 0);
            if ($remaining > 0) {
                $this->api->sendMessage(
                    $chatId,
                    TelegramCustomEmoji::tag('check').' ظرفیت باز است ('.number_format($remaining).' صندلی باقی‌مانده).',
                );

                return;
            }
        }

        $seminar = null;
        foreach ($this->cache->seminars() as $row) {
            if ((int) ($row['id'] ?? 0) === $seminarId) {
                $seminar = $row;
                break;
            }
        }

        if ($seminar !== null) {
            $hint = $seminar['capacity_hint'] ?? null;
            if ($hint !== null && $hint !== '') {
                $remaining = (int) $hint;
                if ($remaining <= 0) {
                    $this->api->sendMessage($chatId, 'ظرفیت این سمینار تکمیل شده است.');

                    return;
                }

                $this->api->sendMessage(
                    $chatId,
                    TelegramCustomEmoji::tag('check').' ظرفیت باز است (حدود '.number_format($remaining).' صندلی — آخرین وضعیت هنگام پرداخت بررسی می‌شود).',
                );

                return;
            }
        }

        $this->api->sendMessage(
            $chatId,
            TelegramCustomEmoji::tag('notes').' برای ثبت‌نام از دکمه پرداخت استفاده کنید. ظرفیت دقیق هنگام پرداخت بررسی می‌شود.',
        );
    }
}
