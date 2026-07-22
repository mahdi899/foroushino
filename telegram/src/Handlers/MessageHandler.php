<?php

declare(strict_types=1);

namespace TelegramHost\Handlers;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\LiveClient;
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
        private readonly LiveClient $live,
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

        if (isset($message['reply_to_message'])) {
            $reply = $this->live->supportTryReply($telegramUserId, $message);
            if (! empty($reply['handled'])) {
                return;
            }
        }

        $conversation = $this->conversations->get($telegramUserId);

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

        foreach (array_slice($courses, 0, 10) as $course) {
            $productId = (int) $course['id'];
            $present = $this->live->productPresent($telegramUserId, $productId);
            if (! empty($present['ok']) && ! empty($present['owns'])) {
                $this->sendProductView($chatId, $present);

                continue;
            }

            $caption = CatalogPresenter::courseCaption($course);
            $keyboard = ['reply_markup' => ['inline_keyboard' => [[InlineButtons::buy($productId)]]]];

            $photo = (string) ($course['photo_url'] ?? $present['photo'] ?? '');
            if ($photo !== '') {
                $this->api->sendPhoto($chatId, $photo, $caption, $keyboard);
            } else {
                $this->api->sendMessage($chatId, $caption, $keyboard);
            }
        }
    }

    private function sendSeminarList(int $chatId, int $telegramUserId): void
    {
        $seminars = $this->cache->seminars();
        if ($seminars === []) {
            $this->api->sendMessage($chatId, $this->cache->message('seminars_catalog_empty', 'سمیناری برای نمایش نیست.'));

            return;
        }

        foreach (array_slice($seminars, 0, 10) as $seminar) {
            $productId = (int) ($seminar['product_id'] ?? 0);
            if ($productId > 0) {
                $present = $this->live->productPresent($telegramUserId, $productId);
                if (! empty($present['ok']) && ! empty($present['owns'])) {
                    $this->sendProductView($chatId, $present);

                    continue;
                }
            }

            $caption = CatalogPresenter::seminarCaption($seminar);

            $buttons = $productId > 0
                ? [[InlineButtons::buy($productId, 'ثبت‌نام / پرداخت')], [InlineButtons::capacityCheck((int) $seminar['id'])]]
                : [[InlineButtons::capacityCheck((int) $seminar['id'])]];
            $keyboard = ['reply_markup' => ['inline_keyboard' => $buttons]];

            $photo = (string) ($seminar['photo_url'] ?? '');
            if ($photo !== '') {
                $this->api->sendPhoto($chatId, $photo, $caption, $keyboard);
            } else {
                $this->api->sendMessage($chatId, $caption, $keyboard);
            }
        }
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
        $result = $this->live->satOpen($telegramUserId, $chatId);
        if (! empty($result['state'])) {
            $this->conversations->set($telegramUserId, (string) $result['state'], (array) ($result['context'] ?? []));
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
        $result = $this->live->familySummary($telegramUserId);
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

        $result = $this->live->referralSummary($telegramUserId);
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
        $result = $this->live->userProfile($telegramUserId);
        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'حساب یافت نشد.'));

            return;
        }

        $this->api->sendMessage($chatId, (string) $result['text'], (array) ($result['options'] ?? [
            'parse_mode' => 'HTML',
        ]));
    }
}
