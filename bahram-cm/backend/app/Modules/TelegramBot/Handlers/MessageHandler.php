<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Enums\BotFeatureFlag;
use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\BotAdminPanelService;
use App\Modules\TelegramBot\Services\BotMessageCatalog;
use App\Modules\TelegramBot\Services\ConversationService;
use App\Modules\TelegramBot\Services\MainMenuKeyboard;
use App\Modules\TelegramBot\Services\RegistrationFlowService;
use App\Modules\TelegramBot\Services\RequiredChatMembershipService;
use App\Modules\TelegramBot\Services\SupportTicketBridgeService;
use App\Modules\TelegramBot\Services\TelegramContentPresenter;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Services\TelegramCourseAccessPresenter;
use App\Modules\TelegramBot\Services\TelegramPurchaseFlowService;
use App\Modules\TelegramBot\Services\TelegramSatFlowService;
use App\Modules\TelegramBot\Services\TelegramSubscriberEligibility;
use App\Modules\TelegramBot\Services\TelegramAdminUserStatsService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use App\Services\ReferralService;

class MessageHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly ConversationService $conversations,
        private readonly RegistrationFlowService $registration,
        private readonly RequiredChatMembershipService $membership,
        private readonly MainMenuKeyboard $mainMenu,
        private readonly TelegramBotClientFactory $clients,
        private readonly TelegramProductCatalogService $catalog,
        private readonly TelegramSeminarCatalogService $seminars,
        private readonly TelegramContentPresenter $content,
        private readonly ReferralService $referrals,
        private readonly BotAdminPanelService $botAdmin,
        private readonly TelegramSubscriberEligibility $subscriberEligibility,
        private readonly SupportTicketBridgeService $supportTickets,
        private readonly TelegramPurchaseFlowService $purchaseFlow,
        private readonly TelegramSatFlowService $satFlow,
        private readonly TelegramAdminUserStatsService $userStats,
        private readonly TelegramCourseAccessPresenter $courseAccessPresenter,
        private readonly BotMessageCatalog $messages,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $message = (array) data_get($update->payload, 'message', []);
        $from = (array) ($message['from'] ?? []);
        $telegramUserId = (int) ($from['id'] ?? 0);
        $chatId = (int) data_get($message, 'chat.id', $telegramUserId);

        if ($telegramUserId <= 0) {
            return;
        }

        if (
            filled($bot->reportsGroupChatId())
            && (string) data_get($message, 'chat.id') === (string) $bot->reportsGroupChatId()
        ) {
            app(\App\Modules\TelegramBot\Services\SupportAdminReplyService::class)
                ->handleIncomingSupportMessage($bot, $message);

            return;
        }

        // Never reply inside groups/channels — admin panel & user UX stay in private chat only.
        $chatType = (string) data_get($message, 'chat.type', 'private');
        if ($chatType !== 'private') {
            return;
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
                'language_code' => $from['language_code'] ?? null,
            ],
        );

        $account->fill([
            'telegram_username' => $from['username'] ?? $account->telegram_username,
            'first_name' => $from['first_name'] ?? $account->first_name,
            'last_name' => $from['last_name'] ?? $account->last_name,
            'language_code' => $from['language_code'] ?? $account->language_code,
        ]);
        if ($account->isDirty()) {
            $account->save();
        }
        $account->syncPermanentAdminFlag();

        $client = $this->clients->forBot($bot);
        $conversation = $this->conversations->forAccount($account);
        $text = trim((string) ($message['text'] ?? ''));

        if (! $bot->is_active && ! $account->isBotAdmin()) {
            $client->sendMessage($chatId, '⛔ ربات موقتاً غیرفعال است. لطفاً بعداً دوباره تلاش کنید.');

            return;
        }

        if (str_starts_with($text, '/start')) {
            $payload = trim(substr($text, 6));
            if ($payload !== '') {
                $this->conversations->mergeContext($conversation, ['start_payload' => $payload]);
            }
            $this->registration->start($bot, $account, $conversation);

            return;
        }

        if ($account->isBotAdmin()) {
            if ($this->botAdmin->handleRequiredChatShareOrForward($bot, $account, $conversation, $chatId, $message)) {
                return;
            }

            if (isset($message['users_shared']) && $this->botAdmin->handleUsersShared($bot, $account, $conversation, $chatId, $message)) {
                return;
            }

            if (isset($message['photo']) && $this->botAdmin->handlePhotoInput($bot, $account, $conversation, $chatId, $message)) {
                return;
            }

            if ($text !== '' && $this->botAdmin->handleTextInput($bot, $account, $conversation, $chatId, $text)) {
                return;
            }
        }

        // Refresh after admin handlers may have changed conversation state.
        $conversation->refresh();

        // User Reply on a support message → continue thread in reports group.
        if ($this->supportTickets->tryHandleUserReplyToSupport($bot, $account, $message)) {
            return;
        }

        if ($conversation->state === ConversationState::WaitingForCardToCardReceipt) {
            $this->purchaseFlow->handleCardToCardReceiptMessage($bot, $account, $chatId, $message, $text);

            return;
        }

        if ($conversation->state === ConversationState::FillingSatApplication && $text !== '') {
            if ($this->satFlow->handleText($bot, $account, $chatId, $text)) {
                return;
            }
            // Menu button cancelled SAT draft — fall through to menu handler.
            $conversation->refresh();
        }

        if ($conversation->state === ConversationState::WaitingForDiscountCode && $text !== '') {
            $this->purchaseFlow->applyDiscountCodeAndContinue($bot, $account, $chatId, $text);

            return;
        }

        if ($conversation->state === ConversationState::WaitingForSupportMessage) {
            if (in_array($text, ['لغو', '/cancel'], true)) {
                $this->conversations->transition($conversation, ConversationState::Idle, [
                    'support' => null,
                ]);
                $client->sendMessage($chatId, 'ارسال پیام پشتیبانی لغو شد.', [
                    'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
                ]);

                return;
            }

            $hasMedia = isset($message['photo'])
                || isset($message['document'])
                || isset($message['video'])
                || isset($message['voice'])
                || isset($message['audio'])
                || isset($message['sticker']);

            if ($text === '' && ! $hasMedia) {
                return;
            }

            $this->handleSupportUserMessage($bot, $account, $conversation, $chatId, $message, $text);

            return;
        }

        if ($this->canAccessMainFeatures($bot, $account)) {
            if (! $this->membership->isSatisfied($bot, $account)) {
                $this->membership->promptJoin($bot, $account);

                return;
            }

            if ($this->mainMenu->isMenuButton($text, $account, $bot)) {
                $this->handleMenuButton($bot, $account, $chatId, $text);

                return;
            }
        }

        if (isset($message['contact'])) {
            $this->registration->handleContact($bot, $account, $conversation, $message);

            return;
        }

        if ($text !== '') {
            $this->registration->handleText($bot, $account, $conversation, $text);
        }
    }

    private function canAccessMainFeatures(TelegramBot $bot, TelegramAccount $account): bool
    {
        if ($account->isBotAdmin()) {
            return true;
        }

        if (! $bot->featureEnabled(BotFeatureFlag::CollectPhoneAndName)) {
            return true;
        }

        return $account->isLinked() && $account->hasVerifiedMobile();
    }

    private function handleMenuButton(TelegramBot $bot, TelegramAccount $account, int $chatId, string $text): void
    {
        $client = $this->clients->forBot($bot);

        match ($text) {
            'دوره کمپین نویسی 🎓' => $this->sendProducts($client, $bot, $account, $chatId),
            'سمینارها 🎤' => $this->sendSeminars($client, $chatId),
            'سات ☎️' => $this->sendSatStatus($client, $chatId, $account),
            'کانال مرجع 📣' => $this->sendReferenceChannel($client, $chatId, $bot),
            'خانواده 👨‍👩‍👧‍👦' => $this->sendFamily($client, $chatId, $account),
            'معرفی دوستان 🎁' => $this->sendReferral($client, $chatId, $account, $bot),
            'پشتیبانی 🎫' => $this->openSupportHub($client, $bot, $account, $chatId),
            'حساب کاربری 👤' => $this->sendAccount($client, $chatId, $account),
            'پنل ادمین بات 🛠' => $this->botAdmin->openDashboard($bot, $account, $chatId),
            default => $client->sendMessage($chatId, 'منوی اصلی:', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]),
        };
    }

    private function openSupportHub($client, TelegramBot $bot, TelegramAccount $account, int $chatId): void
    {
        $requiresSub = $bot->featureEnabled(BotFeatureFlag::TicketRequiresSubscription)
            || $bot->featureEnabled(BotFeatureFlag::SupportRequiresSubscription);

        if ($requiresSub && ! $this->subscriberEligibility->hasQualifyingAccess($account)) {
            $client->sendMessage($chatId, $this->subscriberEligibility->denialMessage());

            return;
        }

        $client->sendMessage($chatId, $this->messages->get($bot, 'support_prompt'), [
            'reply_markup' => [
                'inline_keyboard' => [
                    [['text' => $this->messages->get($bot, 'support_category_purchase'), 'callback_data' => 'support:cat:purchase']],
                    [['text' => $this->messages->get($bot, 'support_category_campaign_course'), 'callback_data' => 'support:cat:campaign_course']],
                    [['text' => $this->messages->get($bot, 'support_category_sat'), 'callback_data' => 'support:cat:sat']],
                    [['text' => $this->messages->get($bot, 'support_category_other'), 'callback_data' => 'support:cat:other']],
                ],
            ],
        ]);
    }

    /** @param  array<string, mixed>  $message */
    private function handleSupportUserMessage(
        TelegramBot $bot,
        TelegramAccount $account,
        $conversation,
        int $chatId,
        array $message,
        string $text,
    ): void {
        $client = $this->clients->forBot($bot);
        $category = (string) data_get($conversation->context, 'support.category', 'other');
        $subjects = SupportTicketBridgeService::CATEGORY_LABELS;

        if (blank($bot->reportsGroupChatId())) {
            $client->sendMessage(
                $chatId,
                '⛔ گروه گزارشات هنوز تنظیم نشده است. لطفاً بعداً دوباره تلاش کنید.',
                ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
            );
            $this->conversations->transition($conversation, ConversationState::Idle, [
                'support' => null,
            ]);

            return;
        }

        try {
            $ticket = $this->supportTickets->openOrContinue(
                $account,
                $category,
                $subjects[$category] ?? 'پشتیبانی تلگرام',
            );
            $this->supportTickets->appendUserMessage($ticket, $text !== '' ? $text : '[رسانه]');
            $mirrored = $this->supportTickets->mirrorToSupportGroup(
                $bot,
                $ticket,
                $account,
                (int) ($message['message_id'] ?? 0),
                $this->supportTickets->categoryTopicId($category),
                $category,
            );
        } catch (\Throwable $e) {
            $client->sendMessage($chatId, 'ارسال پیام پشتیبانی ناموفق بود. لطفاً دوباره تلاش کنید.');

            return;
        }

        $this->conversations->transition($conversation, ConversationState::Idle, [
            'support' => null,
        ]);
        $ack = $client->sendMessage(
            $chatId,
            $this->messages->get($bot, 'support_message_received'),
            ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
        );
        $ackId = (int) ($ack['message_id'] ?? 0);
        if ($ackId > 0 && ($mirrored['id_message_id'] ?? 0) > 0) {
            $this->supportTickets->mapSupportThreadToUser(
                $ticket->id,
                $mirrored['support_chat_id'],
                $mirrored['id_message_id'],
                (string) $chatId,
                $ackId,
                $mirrored['topic_id'] ?? null,
                $mirrored['forward_message_id'] ?? null,
            );
        }
    }

    private function sendProducts($client, TelegramBot $bot, TelegramAccount $account, int $chatId): void
    {
        $products = $this->catalog->listPublicCourses();
        if ($products->isEmpty()) {
            $client->sendMessage(
                $chatId,
                "در حال حاضر دوره فعالی برای تلگرام تعریف نشده است.\nاز پنل سایت → تجارت → محصولات، گزینه «نمایش در تلگرام» را برای دوره فعال کنید."
            );

            return;
        }

        foreach ($products->take(10) as $product) {
            $view = $this->courseAccessPresenter->present($bot, $account, $product);
            $client->sendMessage($chatId, $view['text'], $view['options']);
        }
    }

    private function sendSeminars($client, int $chatId): void
    {
        $seminars = $this->seminars->listUpcoming();
        if ($seminars->isEmpty()) {
            $client->sendMessage($chatId, 'در حال حاضر سمینار فعالی برای نمایش وجود ندارد.');

            return;
        }

        foreach ($seminars as $seminar) {
            $client->sendMessage(
                $chatId,
                $this->content->formatSeminarMessage($seminar),
                $this->content->seminarSendOptions($seminar),
            );
        }
    }

    private function sendSatStatus($client, int $chatId, TelegramAccount $account): void
    {
        $bot = $account->bot ?? TelegramBot::query()->find($account->telegram_bot_id);
        if ($bot === null) {
            $client->sendMessage($chatId, 'ربات در دسترس نیست.');

            return;
        }

        $this->satFlow->open($bot, $account, $chatId);
    }

    private function sendReferenceChannel($client, int $chatId, ?TelegramBot $bot = null): void
    {
        $identityUrl = TelegramSiteUrl::identityPage();
        $text = $bot
            ? $this->messages->get($bot, 'purchase_need_course')
            : BotMessageCatalog::DEFAULTS['purchase_need_course']['body'];
        $this->sendWithLink(
            $client,
            $chatId,
            $text,
            $identityUrl,
            '🔐 احراز هویت سطح ۲',
        );
    }

    private function sendFamily($client, int $chatId, TelegramAccount $account): void
    {
        $familyUrl = TelegramSiteUrl::familyHome();

        if (! $account->user_id || ! $account->user) {
            $this->sendWithLink($client, $chatId, 'ابتدا ثبت‌نام را کامل کنید.', $familyUrl, '🌐 صفحه خانواده');

            return;
        }

        try {
            app(\App\Services\Family\FamilyAssignmentService::class)->assign($account->user);
            $message = 'خانواده شما فعال است. برای مشاهده محتوا وارد وب‌اپ خانواده شوید.';
        } catch (\Throwable) {
            $message = 'خانواده شما از طریق وب‌اپ دامنه اصلی در دسترس است.';
        }

        $this->sendWithLink($client, $chatId, $message, $familyUrl, '🌐 ورود به خانواده');
    }

    private function sendReferral($client, int $chatId, TelegramAccount $account, TelegramBot $bot): void
    {
        if (! $bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $client->sendMessage($chatId, 'زیرمجموعه‌گیری فعلاً غیرفعال است.');

            return;
        }

        try {
            $code = $this->referrals->getOrCreateCode($account->user);
            $summary = $this->referrals->summary($account->user);
            $client->sendMessage(
                $chatId,
                "لینک معرفی:\n/start ref_{$code->code}\n\n"
                .'ثبت‌نام‌ها: '.($summary['registrations'] ?? $summary['signups'] ?? 0)."\n"
                .'پاداش قابل برداشت: '.number_format((int) ($summary['withdrawable'] ?? $summary['balance'] ?? 0)).' تومان'
            );
        } catch (\Throwable) {
            $client->sendMessage($chatId, 'در حال حاضر امکان نمایش لینک معرفی وجود ندارد.');
        }
    }

    private function sendAccount($client, int $chatId, TelegramAccount $account): void
    {
        $panelUrl = TelegramSiteUrl::studentPanel();
        $identityUrl = TelegramSiteUrl::identityPage();
        $text = $this->userStats->formatProfileText($account);

        $keyboard = [];
        foreach (TelegramSiteUrl::urlKeyboardRow('🔐 احراز هویت سطح ۲', $identityUrl) as $row) {
            $keyboard[] = $row;
        }
        foreach (TelegramSiteUrl::urlKeyboardRow('ورود به پنل', $panelUrl) as $row) {
            $keyboard[] = $row;
        }

        $client->sendMessage(
            $chatId,
            $text,
            $keyboard !== []
                ? ['reply_markup' => ['inline_keyboard' => $keyboard]]
                : [],
        );
    }

    private function sendWithLink($client, int $chatId, string $message, ?string $url, string $label): void
    {
        $client->sendMessage(
            $chatId,
            $message,
            TelegramSiteUrl::linkMarkup($url, $label),
        );
    }
}
