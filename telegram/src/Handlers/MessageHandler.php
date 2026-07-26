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
use TelegramHost\Support\CatalogPresenter;
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
            // Unverified users: UpdateRouter relays to Iran synchronously.
            return;
        }

        if (isset($message['reply_to_message'])) {
            $reply = $this->live->supportTryReply($chatId, $telegramUserId, $message);
            if (! empty($reply['handled'])) {
                return;
            }
            if (! empty($reply['offline'])) {
                $this->api->sendMessage($chatId, (string) ($reply['message'] ?? ''));

                return;
            }
        }

        $conversation = $this->conversations->get($telegramUserId);

        if ($text === '/start' || str_starts_with($text, '/start ')) {
            $this->handleStart($chatId, $telegramUserId);

            return;
        }

        if ($conversation['state'] === 'waiting_for_support_message') {
            // Relayed to Iran in UpdateRouter when this state is active.
            return;
        }

        if ($conversation['state'] === 'waiting_for_card_to_card_receipt') {
            return;
        }

        if ($text !== '' && $this->mainMenu->isMenuButton($text)) {
            $this->handleMenuButton($chatId, $telegramUserId, $text);

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

    private function handleStart(int $chatId, int $telegramUserId): void
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->sendMainMenu($chatId, $telegramUserId);

            return;
        }

        $text = $this->cache->message(
            'registration_ask_mobile',
            "به ربات آکادمی بهرام خوش آمدید.\n\nبرای ادامه، شماره موبایل را از دکمه اشتراک‌گذاری بفرستید یا از سایت ثبت‌نام کنید.",
        );
        $this->api->sendMessage($chatId, $text, [
            'reply_markup' => [
                'keyboard' => [[['text' => '📱 اشتراک شماره موبایل', 'request_contact' => true]]],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ],
        ]);
    }

    private function handleMenuButton(int $chatId, int $telegramUserId, string $text): void
    {
        if (! $this->accounts->isVerified($telegramUserId)) {
            $this->api->sendMessage($chatId, 'لطفاً ابتدا ثبت‌نام را با /start تکمیل کنید.');

            return;
        }

        if (! $this->membership->isSatisfied($telegramUserId)) {
            $this->api->sendMessage($chatId, $this->cache->message('membership_required', 'ابتدا در کانال‌های اجباری عضو شوید.'), [
                'reply_markup' => $this->membership->joinPromptMarkup(),
            ]);

            return;
        }

        $action = $this->mainMenu->resolveAction($text);
        match ($action) {
            MainMenu::ACTION_COURSES => $this->sendCourseList($chatId, $telegramUserId),
            MainMenu::ACTION_SEMINARS => $this->sendSeminarList($chatId, $telegramUserId),
            MainMenu::ACTION_SAT => $this->openSat($chatId, $telegramUserId),
            MainMenu::ACTION_CHANNEL => $this->sendReferenceChannel($chatId),
            MainMenu::ACTION_FAMILY => $this->sendFamily($chatId, $telegramUserId),
            MainMenu::ACTION_REFERRAL => $this->sendReferral($chatId, $telegramUserId),
            MainMenu::ACTION_SUPPORT => $this->openSupportHub($chatId),
            MainMenu::ACTION_ACCOUNT => $this->sendAccount($chatId, $telegramUserId),
            default => $this->sendMainMenu($chatId, $telegramUserId),
        };
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
            $seminarId = (int) ($seminar['id'] ?? 0);
            $title = trim((string) ($seminar['title'] ?? 'سمینار'));
            $lines[] = '• '.htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $row = [];
            if ($productId > 0) {
                $row[] = InlineButtons::buy($productId, 'ثبت‌نام / '.mb_substr($title, 0, 18));
            }
            if ($seminarId > 0) {
                $row[] = InlineButtons::capacityCheck($seminarId);
            }
            if ($row !== []) {
                $keyboard[] = $row;
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

    private function openSat(int $chatId, int $telegramUserId): void
    {
        $result = $this->live->satOpen($chatId, $telegramUserId);
        if (! empty($result['state'])) {
            $this->conversations->set($telegramUserId, (string) $result['state'], (array) ($result['context'] ?? []));
        }

        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'بخش سات در دسترس نیست.'));

            return;
        }

        if (! empty($result['text'])) {
            $options = (array) ($result['options'] ?? []);
            if (! isset($options['parse_mode'])) {
                $options['parse_mode'] = 'HTML';
            }
            $this->api->sendMessage($chatId, (string) $result['text'], $options);
        }
    }

    private function sendReferenceChannel(int $chatId): void
    {
        $url = $this->cache->siteUrl('identity', $this->siteBaseUrl.'/identity');
        $text = $this->cache->message('purchase_need_course', 'برای دسترسی به کانال مرجع، احراز هویت سطح ۲ لازم است.');
        $this->api->sendMessage($chatId, $text, [
            'reply_markup' => ['inline_keyboard' => [[InlineButtons::url('احراز هویت سطح ۲', $url, 'lock', 'primary')]]],
        ]);
    }

    private function sendFamily(int $chatId, int $telegramUserId): void
    {
        $result = $this->accounts->familyResponse($telegramUserId);
        if ($result === null || empty($result['text'])) {
            $this->api->sendMessage($chatId, $this->cache->message(
                'account_snapshot_pending',
                'اطلاعات خانواده هنوز روی سرور ربات ذخیره نشده. چند دقیقه بعد دوباره امتحان کنید.',
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
                'اطلاعات معرفی هنوز روی سرور ربات ذخیره نشده. چند دقیقه بعد دوباره امتحان کنید.',
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
        $this->api->sendMessage($chatId, $this->cache->message('support_prompt', 'دسته پشتیبانی را انتخاب کنید:'), [
            'reply_markup' => [
                'inline_keyboard' => [
                    [[InlineButtons::callback($this->cache->message('support_category_purchase', 'خرید و پرداخت'), 'support:cat:purchase', 'cart', 'primary')]],
                    [[InlineButtons::callback($this->cache->message('support_category_campaign_course', 'دوره کمپین‌نویسی'), 'support:cat:campaign_course', 'graduation')]],
                    [[InlineButtons::callback($this->cache->message('support_category_sat', 'سات'), 'support:cat:sat', 'bell')]],
                    [[InlineButtons::callback($this->cache->message('support_category_other', 'سایر'), 'support:cat:other', 'chat')]],
                ],
            ],
        ]);
    }

    private function sendAccount(int $chatId, int $telegramUserId): void
    {
        $result = $this->accounts->profileResponse($telegramUserId);
        if ($result !== null && ! empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) $result['text'], (array) ($result['options'] ?? [
                'parse_mode' => 'HTML',
            ]));

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
            'اطلاعات حساب هنوز روی سرور ربات ذخیره نشده. چند دقیقه بعد دوباره امتحان کنید.',
        ));
    }
}
