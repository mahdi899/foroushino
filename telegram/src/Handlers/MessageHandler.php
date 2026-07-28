<?php

declare(strict_types=1);

namespace TelegramHost\Handlers;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\AdminFastClient;
use TelegramHost\Http\ResilientLiveClient;
use TelegramHost\Routing\IranSyncRelay;
use TelegramHost\Services\HostAdminShell;
use TelegramHost\Services\HostDestinationsFlow;
use TelegramHost\Services\HostRegistrationFlow;
use TelegramHost\Services\HostSatFlow;
use TelegramHost\Services\HostSupportService;
use TelegramHost\Services\MainMenu;
use TelegramHost\Services\MembershipGate;
use TelegramHost\Services\PurchaseFlow;
use TelegramHost\Services\ReferenceChannelFlow;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

final class MessageHandler
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
        private readonly HostRegistrationFlow $registration,
        private readonly AccountSyncCoordinator $accountSync,
        private readonly HostSupportService $support,
        private readonly IranSyncRelay $iranSync,
        private readonly AdminFastClient $adminFast,
        private readonly ReferenceChannelFlow $referenceChannel,
        private readonly HostSatFlow $satFlow,
        private readonly HostAdminShell $adminShell,
        private readonly HostDestinationsFlow $destinationsFlow,
        private readonly string $siteBaseUrl,
    ) {}

    /** @param array<string, mixed> $message */
    public function handle(array $message): void
    {
        $chatId = (int) $message['chat']['id'];
        $telegramUserId = (int) ($message['from']['id'] ?? 0);
        $text = trim((string) ($message['text'] ?? ''));

        if ($telegramUserId <= 0) {
            return;
        }

        if (isset($message['contact'])) {
            if ($this->accounts->isVerified($telegramUserId)) {
                $this->sendMainMenu($chatId, $telegramUserId);

                return;
            }
            $this->registration->contact($chatId, $telegramUserId, (array) $message['contact']);

            return;
        }

        if (isset($message['reply_to_message'])) {
            if ($this->support->tryHandleUserReply($telegramUserId, $message)) {
                return;
            }
        }

        $conversation = $this->conversations->get($telegramUserId);

        if ($text === '/start' || str_starts_with($text, '/start ')) {
            $startPayload = str_starts_with($text, '/start ') ? trim(substr($text, 7)) : null;
            $this->handleStart($chatId, $telegramUserId, (array) ($message['from'] ?? []), $startPayload !== '' ? $startPayload : null);

            return;
        }

        if ($conversation['state'] === 'waiting_for_name' && $text !== '') {
            $this->registration->name($chatId, $telegramUserId, $text);

            return;
        }

        if ($conversation['state'] === 'waiting_for_otp' && $text !== '') {
            $mobile = (string) ($conversation['context']['mobile'] ?? '');
            $this->registration->verifyOtp($chatId, $telegramUserId, $mobile, $text);

            return;
        }

        if ($conversation['state'] === 'waiting_for_support_message') {
            // Menu buttons / cancel exit support mode — don't swallow them as tickets.
            if ($text !== '' && $this->mainMenu->isMenuButton($text)) {
                $this->conversations->set($telegramUserId, 'idle', []);
                $this->handleMenuButton($chatId, $telegramUserId, $text, (array) ($message['from'] ?? []));

                return;
            }
            if ($this->support->isCancelText($text)) {
                $this->conversations->set($telegramUserId, 'idle', []);
                $this->sendMainMenu($chatId, $telegramUserId);

                return;
            }

            $this->support->handleUserMessage($chatId, $telegramUserId, $message);

            return;
        }

        if ($conversation['state'] === 'filling_sat_application') {
            if ($this->satFlow->handleText($chatId, $telegramUserId, $text)) {
                return;
            }
            // Menu button exited SAT — fall through to menu handler below if needed.
            if ($text !== '' && $this->mainMenu->isMenuButton($text)) {
                $this->handleMenuButton($chatId, $telegramUserId, $text, (array) ($message['from'] ?? []));

                return;
            }

            return;
        }

        if ($conversation['state'] === 'waiting_for_card_to_card_receipt') {
            $this->api->sendMessage($chatId, $this->cache->message(
                'c2c_receipt_received',
                'رسید دریافت شد و در صف ثبت سفارش است.',
            ));

            return;
        }

        if (in_array($conversation['state'], ['admin_panel', 'admin_waiting_input'], true)) {
            if ($this->adminShell->isExitText($text)) {
                $this->adminShell->exitToMain($chatId, $telegramUserId);

                return;
            }

            if ($text !== '' && $this->mainMenu->isMenuButton($text)) {
                $this->conversations->set($telegramUserId, 'idle', []);
                $this->handleMenuButton($chatId, $telegramUserId, $text, (array) ($message['from'] ?? []));

                return;
            }

            // Photo/document updates are queued when sync relay fails — wait for drain.
            if ($text === '' && (isset($message['photo']) || isset($message['document']))) {
                return;
            }

            // Sync relay to Iran failed — unlock locally with actionable guidance.
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->api->sendMessage(
                $chatId,
                TelegramCustomEmoji::tag('warning')
                ." پنل ادمین به سرور اصلی وصل نشد.\n"
                ."درخواست در صف ماند؛ چند لحظه دیگر دوباره «پنل ادمین» را باز کنید.\n"
                .'اگر ادامه داشت: iran_relay_per_webhook را روی ۲ بگذارید و circuit را از diagnose.php?reset_circuit=1 ریست کنید.',
                ['reply_markup' => $this->mainMenu->replyMarkup($telegramUserId)],
            );

            return;
        }

        if ($text !== '' && $this->mainMenu->isMenuButton($text)) {
            // Local cache first — instant reply. Account mirror is Iran→host push.
            $this->handleMenuButton($chatId, $telegramUserId, $text, (array) ($message['from'] ?? []));

            return;
        }

        if ($conversation['state'] === 'waiting_for_discount_code' && $text !== '') {
            $this->purchaseFlow->applyDiscountCode($chatId, $telegramUserId, $text);

            return;
        }

        $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'از دکمه‌های منو استفاده کنید.'), [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
    }

    /**
     * @param array<string, mixed> $from
     */
    private function handleStart(int $chatId, int $telegramUserId, array $from = [], ?string $startPayload = null): void
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->sendMainMenu($chatId, $telegramUserId);

            $normalized = strtolower(ltrim((string) $startPayload, " \t=_-"));
            if (in_array($normalized, ['reference', 'refch', 'reference_channel'], true)) {
                $this->referenceChannel->open($chatId, $telegramUserId);
            }

            return;
        }

        // Ask for the phone number immediately from local cache — no blocking
        // Iran round-trip. If this Telegram user already has a verified
        // account on Iran, the background sync triggered after this reply
        // (see HostBackgroundSync in webhook.php) picks it up within this
        // same request, so the very next button press already sees it.
        $this->registration->showLocalWelcome($chatId, $telegramUserId);
    }

    private function handleMenuButton(int $chatId, int $telegramUserId, string $text, array $from = []): void
    {
        if (! $this->accounts->isVerified($telegramUserId)) {
            $this->handleStart($chatId, $telegramUserId, $from);

            return;
        }

        if (! $this->membership->isSatisfied($telegramUserId)) {
            $this->api->sendMessage($chatId, $this->cache->message('membership_required', 'ابتدا در کانال‌های اجباری عضو شوید.'), [
                'reply_markup' => $this->membership->joinPromptMarkup(),
            ]);

            return;
        }

        // Leaving checkout / other flows when user taps a main-menu button.
        $conversation = $this->conversations->get($telegramUserId);
        if (($conversation['state'] ?? 'idle') !== 'idle') {
            $this->conversations->set($telegramUserId, 'idle', []);
        }

        $action = $this->mainMenu->resolveAction($text);
        match ($action) {
            MainMenu::ACTION_COURSES => $this->sendCourseList($chatId, $telegramUserId),
            MainMenu::ACTION_SEMINARS => $this->sendSeminarList($chatId, $telegramUserId),
            MainMenu::ACTION_SAT => $this->satFlow->open($chatId, $telegramUserId),
            MainMenu::ACTION_CHANNEL => $this->referenceChannel->open($chatId, $telegramUserId),
            MainMenu::ACTION_FAMILY => $this->sendFamily($chatId, $telegramUserId),
            MainMenu::ACTION_REFERRAL => $this->sendReferral($chatId, $telegramUserId),
            MainMenu::ACTION_SUPPORT => $this->openSupportHub($chatId),
            MainMenu::ACTION_ACCOUNT => $this->sendAccount($chatId, $telegramUserId),
            MainMenu::ACTION_ADMIN => $this->openAdminShell($chatId, $telegramUserId, $text),
            default => $this->sendMainMenu($chatId, $telegramUserId),
        };
    }

    private function openAdminShell(int $chatId, int $telegramUserId, string $text): void
    {
        $this->conversations->set($telegramUserId, 'admin_panel', []);

        if ($this->adminFast->openDashboard($chatId, $telegramUserId)) {
            return;
        }

        $this->adminShell->open($chatId, $telegramUserId);
        $update = [
            'update_id' => 0,
            'message' => [
                'message_id' => 0,
                'date' => time(),
                'chat' => ['id' => $chatId, 'type' => 'private'],
                'from' => ['id' => $telegramUserId],
                'text' => $text !== '' ? $text : 'پنل ادمین',
            ],
        ];
        if (! $this->iranSync->tryRelay($chatId, $telegramUserId, $update)) {
            $this->iranSync->enqueue($update);
        }
    }

    private function sendMainMenu(int $chatId, int $telegramUserId): void
    {
        $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'منوی اصلی آکادمی بهرام'), [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
    }

    private function sendCourseList(int $chatId, int $telegramUserId): void
    {
        $courses = $this->cache->courses();
        if ($courses === []) {
            $this->api->sendMessage($chatId, $this->cache->message('purchase_catalog_empty', 'هنوز دوره‌ای فعال نیست.'));

            return;
        }

        $lines = [TelegramCustomEmoji::tag('graduation').' <b>دوره‌های فعال</b>', ''];
        $keyboard = [];
        foreach (array_slice($courses, 0, 12) as $course) {
            $productId = (int) $course['id'];
            $title = trim((string) ($course['title'] ?? 'دوره'));
            $price = isset($course['sale_price']) && (int) $course['sale_price'] > 0
                ? (int) $course['sale_price']
                : (int) ($course['price'] ?? 0);
            $lines[] = '• '.htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8')
                .($price > 0 ? ' — '.number_format($price).' تومان' : '');
            $keyboard[] = [InlineButtons::buy($productId, mb_substr($title, 0, 28))];
        }

        $this->api->sendMessage($chatId, implode("\n", $lines), [
            'parse_mode' => 'HTML',
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ]);
    }

    private function sendSeminarList(int $chatId, int $telegramUserId): void
    {
        $seminars = $this->cache->seminars();
        if ($seminars === []) {
            $this->api->sendMessage($chatId, $this->cache->message('seminars_catalog_empty', 'سمیناری برای نمایش نیست.'));

            return;
        }

        $lines = [TelegramCustomEmoji::tag('mic').' <b>سمینارها</b>', ''];
        $keyboard = [];
        foreach (array_slice($seminars, 0, 8) as $seminar) {
            $productId = (int) ($seminar['product_id'] ?? 0);
            $title = trim((string) ($seminar['title'] ?? 'سمینار'));
            $capacityHint = $seminar['capacity_hint'] ?? null;
            $capacitySuffix = '';
            if ($capacityHint !== null && $capacityHint !== '') {
                $capacitySuffix = (int) $capacityHint > 0
                    ? ' — '.number_format((int) $capacityHint).' صندلی باقی‌مانده'
                    : ' — ظرفیت تکمیل';
            }
            $lines[] = '• '.htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8').$capacitySuffix;
            // No separate "check capacity" step — capacity is already synced
            // locally from Iran, so tapping the seminar goes straight to the
            // purchase flow (which re-verifies with Iran at payment time).
            if ($productId > 0) {
                $keyboard[] = [InlineButtons::buy($productId, 'ثبت‌نام / '.mb_substr($title, 0, 18))];
            }
        }

        $this->api->sendMessage($chatId, implode("\n", $lines), [
            'parse_mode' => 'HTML',
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ]);
    }

    /** @param array<string, mixed> $present */
    private function sendProductView(int $chatId, array $present): void
    {
        $text = (string) ($present['text'] ?? '');
        $options = (array) ($present['options'] ?? []);
        if (! isset($options['parse_mode'])) {
            $options['parse_mode'] = 'HTML';
        }
        $photo = (string) ($present['photo'] ?? '');

        if ($photo !== '') {
            $this->api->sendPhoto($chatId, $photo, $text, $options);
        } else {
            $this->api->sendMessage($chatId, $text, $options);
        }
    }

    private function sendFamily(int $chatId, int $telegramUserId): void
    {
        $result = $this->accounts->familyResponse($telegramUserId);
        if ($result === null || empty($result['text'])) {
            $this->api->sendMessage($chatId, $this->cache->message(
                'account_snapshot_pending',
                'اطلاعات خانواده هنوز همگام نشده. چند لحظه بعد دوباره «خانواده» را بزنید.',
            ));

            return;
        }
        if (empty($result['ok']) && isset($result['message'])) {
            $this->api->sendMessage($chatId, (string) $result['message']);

            return;
        }

        $this->api->sendMessage($chatId, (string) $result['text'], [
            'reply_markup' => (array) ($result['reply_markup'] ?? []),
        ]);
    }

    private function sendReferral(int $chatId, int $telegramUserId): void
    {
        if (! $this->cache->featureEnabled('referral_enabled')) {
            $this->api->sendMessage($chatId, 'این بخش فعلاً غیرفعال است.');

            return;
        }

        $result = $this->accounts->referralResponse($telegramUserId);
        if ($result === null) {
            $this->api->sendMessage($chatId, $this->cache->message(
                'account_snapshot_pending',
                'اطلاعات معرفی هنوز همگام نشده. چند لحظه بعد دوباره امتحان کنید.',
            ));

            return;
        }
        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'لینک معرفی در دسترس نیست.'));

            return;
        }

        $this->api->sendMessage($chatId, (string) $result['text'], [
            'reply_markup' => (array) ($result['reply_markup'] ?? []),
        ]);
    }

    private function openSupportHub(int $chatId): void
    {
        // Categories from host message cache — no Iran round-trip.
        // Each row must be [button], not [[button]] — extra nesting makes Telegram
        // reject the keyboard ("InlineKeyboardButton must be an Object").
        $this->api->sendMessage($chatId, $this->cache->message('support_prompt', 'دسته پشتیبانی را انتخاب کنید:'), [
            'reply_markup' => [
                'inline_keyboard' => [
                    [InlineButtons::callback($this->cache->message('support_category_purchase', 'خرید و پرداخت'), 'support:cat:purchase', 'cart', 'primary')],
                    [InlineButtons::callback($this->cache->message('support_category_campaign_course', 'دوره کمپین‌نویسی'), 'support:cat:campaign_course', 'graduation')],
                    [InlineButtons::callback($this->cache->message('support_category_sat', 'سات'), 'support:cat:sat', 'bell')],
                    [InlineButtons::callback($this->cache->message('support_category_other', 'سایر'), 'support:cat:other', 'chat')],
                ],
            ],
        ]);
    }

    private function sendAccount(int $chatId, int $telegramUserId): void
    {
        if ($this->destinationsFlow->sendAccount($chatId, $telegramUserId)) {
            return;
        }

        $row = $this->accounts->get($telegramUserId);
        if ($row !== null && ! empty($row['display_name'])) {
            $lines = [
                TelegramCustomEmoji::tag('user').' <b>'.htmlspecialchars((string) $row['display_name'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</b>',
            ];
            if (! empty($row['mobile'])) {
                $lines[] = 'موبایل: <code>'.htmlspecialchars((string) $row['mobile'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</code>';
            }
            $this->api->sendMessage($chatId, implode("\n", $lines), ['parse_mode' => 'HTML']);

            return;
        }

        $this->api->sendMessage($chatId, $this->cache->message(
            'account_snapshot_pending',
            'اطلاعات حساب هنوز همگام نشده. چند لحظه بعد دوباره «حساب من» را بزنید.',
        ));
    }
}
