<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\BotAdminPanelService;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\MainMenuKeyboard;
use App\Modules\TelegramBot\Services\RegistrationFlowService;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use App\Modules\TelegramBot\Services\TelegramCheckoutService;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramPurchaseFlowService;
use App\Modules\TelegramBot\Services\TelegramSubscriberEligibility;
use App\Modules\TelegramBot\Services\TelegramCourseAccessPresenter;

class CallbackQueryHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly RegistrationFlowService $registration,
        private readonly RequiredChatMembershipService $membership,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly TelegramBotClientFactory $clients,
        private readonly TelegramProductCatalogService $catalog,
        private readonly TelegramCheckoutService $checkout,
        private readonly BotAdminPanelService $botAdmin,
        private readonly TelegramSubscriberEligibility $subscriberEligibility,
        private readonly TelegramPurchaseFlowService $purchaseFlow,
        private readonly TelegramCourseAccessPresenter $courseAccessPresenter,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $callback = (array) data_get($update->payload, 'callback_query', []);
        $from = (array) ($callback['from'] ?? []);
        $telegramUserId = (int) ($from['id'] ?? 0);
        $callbackId = (string) ($callback['id'] ?? '');
        $data = (string) ($callback['data'] ?? '');
        $chatId = (int) data_get($callback, 'message.chat.id', $telegramUserId);

        if ($telegramUserId <= 0) {
            return;
        }

        // Allow C2C review callbacks inside the payment-reports group/channel only.
        $chatType = (string) data_get($callback, 'message.chat.type', 'private');
        if ($chatType !== 'private') {
            $paymentChat = $bot->paymentReportsChatId();
            $isC2cReview = str_starts_with($data, 'c2c:ok:') || str_starts_with($data, 'c2c:no:');
            if (! $isC2cReview || blank($paymentChat) || (string) $chatId !== (string) $paymentChat) {
                return;
            }
        }

        $account = TelegramAccount::query()->firstOrCreate(
            [
                'telegram_bot_id' => $bot->id,
                'telegram_user_id' => $telegramUserId,
            ],
            [
                'telegram_username' => $from['username'] ?? null,
                'first_name' => $from['first_name'] ?? null,
                'last_name' => $from['last_name'] ?? null,
            ],
        );

        if (! $bot->is_active && ! $account->isBotAdmin()) {
            $client = $this->clients->forBot($bot);
            $this->answer($client, $callbackId, 'ربات موقتاً غیرفعال است.', true);

            return;
        }

        $client = $this->clients->forBot($bot);
        $messageId = (int) data_get($callback, 'message.message_id', 0);

        if ($this->botAdmin->handleCallback($bot, $account, $data, $chatId, $messageId, $callbackId)) {
            return;
        }

        if (str_starts_with($data, 'support:cat:')) {
            $this->handleSupportCategory($client, $bot, $account, $chatId, $callbackId, $data);

            return;
        }

        if (str_starts_with($data, 'buy:skip:')) {
            $productId = (int) substr($data, strlen('buy:skip:'));
            $this->answer($client, $callbackId, 'ادامه بدون کد تخفیف');
            $this->purchaseFlow->proceedToPaymentMethods($bot, $account, $chatId, $productId, null);

            return;
        }

        if (str_starts_with($data, 'buy:')) {
            $this->handleBuy($client, $bot, $account, $chatId, $callbackId, $data);

            return;
        }

        if (str_starts_with($data, 'pay:zp:')) {
            $this->answer($client, $callbackId, 'در حال آماده‌سازی…');
            $this->purchaseFlow->startZarinpal($bot, $account, $chatId, (int) substr($data, 7));

            return;
        }

        if (str_starts_with($data, 'pay:c2c:')) {
            $this->answer($client, $callbackId, 'در حال ثبت سفارش…');
            $this->purchaseFlow->startCardToCard($bot, $account, $chatId, (int) substr($data, 8));

            return;
        }

        if (str_starts_with($data, 'c2c:ok:') || str_starts_with($data, 'c2c:no:')) {
            $this->purchaseFlow->handleCardToCardReviewCallback(
                $bot,
                $account,
                $client,
                $chatId,
                $messageId,
                $callbackId,
                $data,
            );

            return;
        }

        if ($data === 'seminar:full') {
            $this->answer($client, $callbackId, 'ظرفیت این سمینار تکمیل شده است.', true);

            return;
        }

        if ($data === 'membership:recheck') {
            $this->handleMembershipRecheck($client, $bot, $account, $chatId, $callbackId);

            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $this->registration->handleCallback($bot, $account, $conversation, $data);

        if ($callbackId !== '') {
            $client->answerCallbackQuery($callbackId);
        }
    }

    private function handleSupportCategory(
        $client,
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        string $callbackId,
        string $data,
    ): void {
        $category = substr($data, strlen('support:cat:'));
        if (! in_array($category, ['purchase', 'campaign_course', 'sat', 'other'], true)) {
            $this->answer($client, $callbackId, 'دسته نامعتبر است.', true);

            return;
        }

        $requiresSub = $bot->featureEnabled(BotFeatureFlag::TicketRequiresSubscription)
            || $bot->featureEnabled(BotFeatureFlag::SupportRequiresSubscription);

        if ($requiresSub && ! $this->subscriberEligibility->hasQualifyingAccess($account)) {
            $this->answer($client, $callbackId, 'اشتراک لازم است.', true);
            $client->sendMessage($chatId, $this->subscriberEligibility->denialMessage());

            return;
        }

        if (! $account->isLinked()) {
            $this->answer($client, $callbackId, 'ابتدا ثبت‌نام کنید.', true);

            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::WaitingForSupportMessage, [
            'support' => ['category' => $category],
        ]);

        $this->answer($client, $callbackId, 'پیام خود را بنویسید.');
        $client->sendMessage($chatId, 'پیام پشتیبانی خود را بنویسید (متن یا رسانه). برای انصراف «لغو»:');
    }

    private function handleMembershipRecheck($client, TelegramBot $bot, TelegramAccount $account, int $chatId, string $callbackId): void
    {
        $this->membership->invalidateCache($bot, $account->telegram_user_id);

        if ($this->membership->isSatisfied($bot, $account)) {
            $this->answer($client, $callbackId, '✅ عضویت تأیید شد.');
            if ($account->isLinked() && $account->hasVerifiedMobile()) {
                $client->sendMessage($chatId, 'منوی اصلی:', [
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ]);
            }

            return;
        }

        $this->answer($client, $callbackId, 'هنوز در همه کانال‌های اجباری عضو نیستید.', true);
        $this->membership->promptJoin($bot, $account);
    }

    private function handleBuy(
        $client,
        TelegramBot $bot,
        TelegramAccount $account,
        int $chatId,
        string $callbackId,
        string $data,
    ): void {
        $productId = (int) substr($data, 4);
        if ($productId <= 0) {
            $this->answer($client, $callbackId, 'محصول نامعتبر است.');

            return;
        }

        if (! $account->isLinked() || ! $account->hasVerifiedMobile()) {
            $this->answer($client, $callbackId, 'ابتدا ثبت‌نام و تأیید موبایل را کامل کنید.', true);
            $client->sendMessage($chatId, 'برای خرید، ابتدا از /start ثبت‌نام را کامل کنید.');

            return;
        }

        $product = $this->catalog->findForTelegram($productId);
        if ($product === null) {
            $this->answer($client, $callbackId, 'این محصول در تلگرام موجود نیست.');

            return;
        }

        if ($this->courseAccessPresenter->owns($account, $product)) {
            $this->answer($client, $callbackId, 'قبلاً خریده‌اید', true);
            $view = $this->courseAccessPresenter->present($bot, $account, $product);
            $client->sendMessage($chatId, $view['text'], $view['options']);

            return;
        }

        $product->loadMissing('seminar');
        if ($product->seminar && $product->seminar->isFull()) {
            $this->answer($client, $callbackId, 'ظرفیت این سمینار تکمیل شده است.', true);
            $client->sendMessage($chatId, "⛔ سمینار «{$product->seminar->title}» ظرفیتش تکمیل شده است.");

            return;
        }

        $zp = $this->checkout->zarinpalEnabled($bot);
        $c2c = $this->checkout->cardToCardEnabled($bot);
        if (! $zp && ! $c2c) {
            $this->answer($client, $callbackId, 'هیچ روش پرداختی فعال نیست.', true);
            $client->sendMessage($chatId, '⛔ پرداخت آنلاین و کارت‌به‌کارت هر دو غیرفعال‌اند. با پشتیبانی تماس بگیرید.');

            return;
        }

        $conversation = $this->conversations->forAccount($account);
        $this->conversations->transition($conversation, ConversationState::WaitingForDiscountCode, [
            'checkout' => ['product_id' => $productId, 'coupon' => null],
        ]);

        $base = (int) ($product->price ?? 0);
        $sale = $product->sale_price !== null ? (int) $product->sale_price : null;
        if ($product->seminar) {
            $base = (int) ($product->seminar->price ?: $base);
            $saleRaw = $product->seminar->sale_price ?? $product->sale_price;
            $sale = $saleRaw !== null ? (int) $saleRaw : null;
        }

        $priceBlock = ($sale !== null && $sale > 0 && $sale < $base)
            ? 'قیمت اصلی: '.number_format($base)." تومان\nقیمت با تخفیف: ".number_format($sale).' تومان'
            : 'مبلغ: '.number_format($sale ?: $base).' تومان';

        $this->answer($client, $callbackId, 'کد تخفیف؟');
        $client->sendMessage(
            $chatId,
            "🛒 {$product->title}\n{$priceBlock}\n\n"
            ."اگر کد تخفیف دارید همین‌جا بفرستید (همان کدهای پنل سایت).\n"
            .'کد معرف هم اگر با لینک معرفی وارد شده باشید خودکار اعمال می‌شود.',
            [
                'reply_markup' => [
                    'inline_keyboard' => [
                        [['text' => '⏭ بدون کد تخفیف', 'callback_data' => 'buy:skip:'.$productId]],
                    ],
                ],
            ],
        );
    }

    private function answer($client, string $callbackId, string $text, bool $showAlert = false): void
    {
        if ($callbackId === '') {
            return;
        }

        $client->answerCallbackQuery($callbackId, [
            'text' => mb_substr($text, 0, 200),
            'show_alert' => $showAlert,
        ]);
    }
}
