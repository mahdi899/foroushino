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
use App\Modules\TelegramBot\Services\TelegramOutboundMessenger;
use App\Modules\TelegramBot\Services\TelegramProductCatalogService;
use App\Modules\TelegramBot\Services\TelegramSeminarCatalogService;
use App\Modules\TelegramBot\Services\TelegramCourseAccessPresenter;
use App\Modules\TelegramBot\Services\TelegramPurchaseFlowService;
use App\Modules\TelegramBot\Services\TelegramSatFlowService;
use App\Modules\TelegramBot\Services\TelegramSubscriberEligibility;
use App\Modules\TelegramBot\Services\TelegramAdminUserStatsService;
use App\Support\InflatedMemberCount;
use App\Modules\TelegramBot\Support\TelegramHtml;
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
        private readonly TelegramOutboundMessenger $outbound,
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

        $conversation = $this->conversations->forAccount($account);
        $text = trim((string) ($message['text'] ?? ''));

        if (! $bot->is_active && ! $account->isBotAdmin()) {
            $this->outbound->reply($bot, $chatId, '⛔ ربات موقتاً غیرفعال است. لطفاً بعداً دوباره تلاش کنید.');

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

        // Main-menu reply keyboard — handle early so registration/admin input states do not swallow taps.
        if ($text !== '' && $this->mainMenu->isMenuButton($text, $account, $bot)) {
            $this->handleMainMenuPress($bot, $account, $conversation, $chatId, $text);

            return;
        }

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
                $this->outbound->reply($bot, $chatId, 'ارسال پیام پشتیبانی لغو شد.', [
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

    private function handleMainMenuPress(
        TelegramBot $bot,
        TelegramAccount $account,
        $conversation,
        int $chatId,
        string $text,
    ): void {
        if ($account->isBotAdmin()) {
            if ($conversation->state !== ConversationState::Idle) {
                $this->conversations->reset($conversation);
                $conversation->refresh();
            }
            $this->handleMenuButton($bot, $account, $chatId, $text);

            return;
        }

        if (! $this->canAccessMainFeatures($bot, $account)) {
            $this->replyNow($bot, $chatId, 'لطفاً ابتدا ثبت‌نام را با /start تکمیل کنید.');

            return;
        }

        if (! $this->membership->isSatisfied($bot, $account)) {
            $this->membership->promptJoin($bot, $account);

            return;
        }

        $this->handleMenuButton($bot, $account, $chatId, $text);
    }

    private function handleMenuButton(TelegramBot $bot, TelegramAccount $account, int $chatId, string $text): void
    {
        try {
            $this->clients->forBot($bot)->sendChatAction($chatId, 'typing');
        } catch (\Throwable) {
            // Best-effort UX hint.
        }

        match ($text) {
            'دوره کمپین نویسی 🎓' => $this->sendProducts($bot, $account, $chatId),
            'سمینارها 🎤' => $this->sendSeminars($bot, $chatId),
            'سات ☎️' => $this->sendSatStatus($bot, $chatId, $account),
            'کانال مرجع 📣' => $this->sendReferenceChannel($bot, $chatId),
            'خانواده 👨‍👩‍👧‍👦' => $this->sendFamily($bot, $chatId, $account),
            'معرفی دوستان 🎁' => $this->sendReferral($bot, $chatId, $account),
            'پشتیبانی 🎫' => $this->openSupportHub($bot, $account, $chatId),
            'حساب کاربری 👤' => $this->sendAccount($bot, $chatId, $account),
            'پنل ادمین بات 🛠' => $this->botAdmin->openDashboard($bot, $account, $chatId),
            default => $this->replyNow($bot, $chatId, 'منوی اصلی:', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]),
        };
    }

    /** User-facing reply — queued so inbound webhook ack stays fast (broadcast-style path). */
    private function replyNow(TelegramBot $bot, int $chatId, string $text, array $options = []): void
    {
        $this->outbound->reply($bot, $chatId, $text, $options, sync: false);
    }

    private function openSupportHub(TelegramBot $bot, TelegramAccount $account, int $chatId): void
    {
        $requiresSub = $bot->featureEnabled(BotFeatureFlag::TicketRequiresSubscription)
            || $bot->featureEnabled(BotFeatureFlag::SupportRequiresSubscription);

        if ($requiresSub && ! $this->subscriberEligibility->hasQualifyingAccess($account)) {
            $this->replyNow($bot, $chatId, $this->subscriberEligibility->denialMessage());

            return;
        }

        $this->replyNow($bot, $chatId, $this->messages->get($bot, 'support_prompt'), [
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
        $category = (string) data_get($conversation->context, 'support.category', 'other');
        $subjects = SupportTicketBridgeService::CATEGORY_LABELS;

        if (blank($bot->reportsGroupChatId())) {
            $this->outbound->reply($bot, $chatId, '⛔ گروه گزارشات هنوز تنظیم نشده است. لطفاً بعداً دوباره تلاش کنید.', [
                'reply_markup' => $this->mainMenu->replyMarkup($account, $bot),
            ]);
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
            $this->outbound->reply($bot, $chatId, 'ارسال پیام پشتیبانی ناموفق بود. لطفاً دوباره تلاش کنید.');

            return;
        }

        $this->conversations->transition($conversation, ConversationState::Idle, [
            'support' => null,
        ]);
        $ack = $this->outbound->reply(
            $bot,
            $chatId,
            $this->messages->get($bot, 'support_message_received'),
            ['reply_markup' => $this->mainMenu->replyMarkup($account, $bot)],
            sync: true,
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

    private function sendProducts(TelegramBot $bot, TelegramAccount $account, int $chatId): void
    {
        $products = $this->catalog->listPublicCourses();
        if ($products->isEmpty()) {
            $this->replyNow(
                $bot,
                $chatId,
                TelegramHtml::bold('در حال حاضر دوره فعالی برای تلگرام تعریف نشده است.'),
                ['parse_mode' => 'HTML'],
            );

            return;
        }

        foreach ($products->take(10) as $product) {
            $view = $this->courseAccessPresenter->present($bot, $account, $product);
            $this->replyNow($bot, $chatId, $view['text'], $view['options']);
        }
    }

    private function sendSeminars(TelegramBot $bot, int $chatId): void
    {
        $seminars = $this->seminars->listUpcoming();
        if ($seminars->isEmpty()) {
            $this->replyNow($bot, $chatId, 'در حال حاضر سمینار فعالی برای نمایش وجود ندارد.');

            return;
        }

        foreach ($seminars as $seminar) {
            $this->replyNow(
                $bot,
                $chatId,
                $this->content->formatSeminarMessage($seminar),
                $this->content->seminarSendOptions($seminar),
            );
        }
    }

    private function sendSatStatus(TelegramBot $bot, int $chatId, TelegramAccount $account): void
    {
        $this->satFlow->open($bot, $account, $chatId);
    }

    private function sendReferenceChannel(TelegramBot $bot, int $chatId): void
    {
        $identityUrl = TelegramSiteUrl::identityPage();
        $text = $this->messages->get($bot, 'purchase_need_course');
        $this->sendWithLink(
            $bot,
            $chatId,
            $text,
            $identityUrl,
            '🔐 احراز هویت سطح ۲',
        );
    }

    private function sendFamily(TelegramBot $bot, int $chatId, TelegramAccount $account): void
    {
        $familyUrl = TelegramSiteUrl::familyHome();

        if (! $account->user_id || ! $account->user) {
            $this->sendWithLink($bot, $chatId, 'ابتدا ثبت‌نام را کامل کنید.', $familyUrl, '🌐 صفحه خانواده');

            return;
        }

        $user = $account->user;

        try {
            app(\App\Services\Family\FamilyAssignmentService::class)->assign($user);
        } catch (\Throwable) {
            // Assignment is best-effort; still try to show membership if present.
        }

        $membership = app(\App\Services\Family\FamilyAccessService::class)->homeMembership($user);
        if ($membership === null) {
            $this->sendWithLink(
                $bot,
                $chatId,
                "👨‍👩‍👧‍👦 خانواده\n\n"
                ."هنوز به خانواده‌ای وصل نیستید.\n"
                .'با ورود به وب‌اپ، عضویت شما فعال می‌شود.',
                $familyUrl,
                '🌐 ورود به خانواده',
            );

            return;
        }

        $membership->loadMissing('family');
        $family = $membership->family;
        $memberCount = InflatedMemberCount::calculate((int) ($family?->member_count ?? 0));
        $familyId = (int) $membership->family_id;
        $unreadCount = $this->familyUnreadPostCount($user, $membership);

        $lines = [
            '👨‍👩‍👧‍👦 خانواده شما',
            '────────────────',
            '👥 تعداد اعضا: '.number_format($memberCount).' نفر',
        ];

        if ($unreadCount > 0) {
            $lines[] = '📝 پست‌های جدید ندیده‌شده: '.number_format($unreadCount);
            $lines[] = '';
            $lines[] = $unreadCount === 1
                ? 'یک پست جدید منتظر شماست — همین الان سر بزنید.'
                : "{$unreadCount} پست جدید منتظر شماست — بیا خانواده را چک کن.";
        } else {
            $lines[] = '📝 پست جدید ندیده‌شده: ۰';
            $lines[] = '';
            $lines[] = 'فعلاً همه‌چیز را دیده‌اید. برای حال‌وهوای خانواده، یک سر بزنید.';
        }

        $this->sendWithLink($bot, $chatId, implode("\n", $lines), $familyUrl, '🌐 ورود به خانواده');
    }

    private function familyUnreadPostCount(\App\Models\User $user, \App\Models\FamilyMembership $membership): int
    {
        try {
            $familyId = (int) $membership->family_id;
            $afterId = (int) \App\Models\FamilyPostView::query()
                ->where('user_id', $user->id)
                ->where('family_id', $familyId)
                ->max('post_id');

            $feed = app(\App\Services\Family\FeedService::class);

            if ($afterId > 0) {
                return max(0, (int) ($feed->unreadSummary($afterId, $user)['unread_count'] ?? 0));
            }

            // Never opened the feed: count published posts since join.
            $joinedAt = $membership->joined_at;
            $query = \App\Models\FamilyPost::query()
                ->where('status', \App\Enums\Family\FamilyPostStatus::Published->value)
                ->whereNotNull('published_at');

            app(\App\Services\Family\PostAudienceResolver::class)
                ->scopeVisibleToFamily($query, $familyId);

            if ($joinedAt) {
                $query->where('published_at', '>=', $joinedAt);
            }

            return max(0, (int) $query->count());
        } catch (\Throwable) {
            return 0;
        }
    }

    private function sendReferral(TelegramBot $bot, int $chatId, TelegramAccount $account): void
    {
        if (! $bot->featureEnabled(BotFeatureFlag::ReferralEnabled)) {
            $this->replyNow($bot, $chatId, 'زیرمجموعه‌گیری فعلاً غیرفعال است.');

            return;
        }

        try {
            $code = $this->referrals->getOrCreateCode($account->user);
            $summary = $this->referrals->summary($account->user);
            $link = $this->referrals->referralLink($code->code);
            $panelUrl = TelegramSiteUrl::page('panel/referrals');
            $this->replyNow(
                $bot,
                $chatId,
                "لینک دعوت (همکاری در فروش):\n{$link}\n\n"
                ."کد اختصاصی: {$code->code}\n\n"
                .'خریدهای موفق: '.number_format((int) ($summary['successful_purchases'] ?? 0))."\n"
                .'پاداش قابل برداشت: '.number_format((int) ($summary['payable_amount'] ?? 0)).' تومان',
                TelegramSiteUrl::linkMarkup($panelUrl, '🎁 باشگاه مشتریان در پنل')
            );
        } catch (\Throwable) {
            $this->replyNow($bot, $chatId, 'در حال حاضر امکان نمایش لینک معرفی وجود ندارد.');
        }
    }

    private function sendAccount(TelegramBot $bot, int $chatId, TelegramAccount $account): void
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

        $this->replyNow(
            $bot,
            $chatId,
            $text,
            $keyboard !== []
                ? ['reply_markup' => ['inline_keyboard' => $keyboard]]
                : [],
        );
    }

    private function sendWithLink(TelegramBot $bot, int $chatId, string $message, ?string $url, string $label): void
    {
        $this->replyNow(
            $bot,
            $chatId,
            $message,
            TelegramSiteUrl::linkMarkup($url, $label),
        );
    }
}
