<?php

declare(strict_types=1);

namespace TelegramHost;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\SyncClient;
use TelegramHost\Telegram\BotApiClient;

/**
 * Handles one Telegram update end-to-end on the external host.
 *
 * Scope (see telegram/README.md for what is intentionally NOT reimplemented
 * here yet — support tickets, broadcasts, in-bot admin panel, discount UI):
 *   - /start + main menu (fully local, cached messages/keyboard)
 *   - Registration: phone number -> OTP request/verify (both LIVE calls)
 *   - Course/seminar listing (cached catalog display)
 *   - Seminar "is it still open" check before directing to checkout (LIVE)
 *
 * Anything involving money (order creation, payment) intentionally still
 * hands off to a link on the main site rather than being reimplemented here
 * — the payment gateway credentials must never leave the main server.
 */
final class Bot
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly SyncClient $sync,
        private readonly ConversationRepository $conversations,
        private readonly AccountCache $accounts,
        private readonly string $siteBaseUrl,
    ) {}

    /** @param array<string, mixed> $update */
    public function handle(array $update): void
    {
        if (isset($update['message'])) {
            $this->handleMessage($update['message']);

            return;
        }

        if (isset($update['callback_query'])) {
            $this->handleCallback($update['callback_query']);
        }
    }

    /** @param array<string, mixed> $message */
    private function handleMessage(array $message): void
    {
        $chatId = (int) $message['chat']['id'];
        $telegramUserId = (int) $message['from']['id'];
        $text = trim((string) ($message['text'] ?? ''));
        $contact = $message['contact'] ?? null;

        $conversation = $this->conversations->get($telegramUserId);

        if ($text === '/start') {
            $this->startRegistrationOrMenu($chatId, $telegramUserId);

            return;
        }

        if ($contact !== null && $conversation['state'] === 'waiting_for_mobile') {
            $this->requestOtp($chatId, $telegramUserId, (string) $contact['phone_number']);

            return;
        }

        if ($conversation['state'] === 'waiting_for_otp' && ctype_digit($text) && strlen($text) === 5) {
            $this->verifyOtp($chatId, $telegramUserId, $text, $message['from']);

            return;
        }

        if ($this->accounts->isVerified($telegramUserId)) {
            $this->handleMenuText($chatId, $telegramUserId, $text);

            return;
        }

        $this->startRegistrationOrMenu($chatId, $telegramUserId);
    }

    /** @param array<string, mixed> $callback */
    private function handleCallback(array $callback): void
    {
        $chatId = (int) $callback['message']['chat']['id'];
        $data = (string) ($callback['data'] ?? '');
        $this->api->answerCallbackQuery((string) $callback['id']);

        if (str_starts_with($data, 'seminar:check:')) {
            $seminarId = (int) substr($data, strlen('seminar:check:'));
            $this->checkSeminarCapacity($chatId, $seminarId);
        }
    }

    private function startRegistrationOrMenu(int $chatId, int $telegramUserId): void
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->sendMainMenu($chatId);

            return;
        }

        $this->conversations->set($telegramUserId, 'waiting_for_mobile');
        $this->api->sendMessage($chatId, $this->cache->message('registration_ask_mobile', 'شماره موبایل خود را ارسال کنید.'), [
            'reply_markup' => [
                'keyboard' => [[['text' => 'ارسال شماره تماس', 'request_contact' => true]]],
                'resize_keyboard' => true,
            ],
        ]);
    }

    private function requestOtp(int $chatId, int $telegramUserId, string $phone): void
    {
        $mobile = $this->normalizeMobile($phone);
        $result = $this->sync->call('otp/request', ['mobile' => $mobile]);

        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'ارسال کد ناموفق بود.'));

            return;
        }

        $this->conversations->set($telegramUserId, 'waiting_for_otp', ['mobile' => $mobile]);
        $this->api->sendMessage($chatId, 'کد تایید ۵ رقمی ارسال شد. لطفاً همینجا وارد کنید.');
    }

    /** @param array<string, mixed> $from */
    private function verifyOtp(int $chatId, int $telegramUserId, string $code, array $from): void
    {
        $conversation = $this->conversations->get($telegramUserId);
        $mobile = (string) ($conversation['context']['mobile'] ?? '');

        if ($mobile === '') {
            $this->startRegistrationOrMenu($chatId, $telegramUserId);

            return;
        }

        $displayName = trim(((string) ($from['first_name'] ?? '')).' '.((string) ($from['last_name'] ?? '')));

        $result = $this->sync->call('otp/verify', [
            'mobile' => $mobile,
            'code' => $code,
            'telegram_user_id' => $telegramUserId,
            'display_name' => $displayName,
        ]);

        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, (string) ($result['message'] ?? 'کد نادرست است.'));

            return;
        }

        $this->accounts->store($telegramUserId, (array) $result['account']);
        $this->conversations->set($telegramUserId, 'idle');

        $lines = (array) ($result['summary_lines'] ?? []);
        if ($lines !== []) {
            $this->api->sendMessage($chatId, implode("\n", $lines));
        }

        $this->sendMainMenu($chatId);
    }

    private function sendMainMenu(int $chatId): void
    {
        $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'منوی اصلی آکادمی بهرام'), [
            'reply_markup' => [
                'keyboard' => [
                    [['text' => $this->cache->message('menu_btn_courses', 'دوره‌ها')], ['text' => $this->cache->message('menu_btn_seminars', 'سمینارها')]],
                    [['text' => $this->cache->message('menu_btn_support', 'پشتیبانی')]],
                ],
                'resize_keyboard' => true,
            ],
        ]);
    }

    private function handleMenuText(int $chatId, int $telegramUserId, string $text): void
    {
        if ($text === $this->cache->message('menu_btn_courses', 'دوره‌ها')) {
            $this->sendCourseList($chatId);

            return;
        }

        if ($text === $this->cache->message('menu_btn_seminars', 'سمینارها')) {
            $this->sendSeminarList($chatId);

            return;
        }

        $this->sendMainMenu($chatId);
    }

    private function sendCourseList(int $chatId): void
    {
        $courses = $this->cache->courses();
        if ($courses === []) {
            $this->api->sendMessage($chatId, $this->cache->message('purchase_catalog_empty', 'هنوز دوره‌ای فعال نیست.'));

            return;
        }

        foreach (array_slice($courses, 0, 10) as $course) {
            $price = $course['sale_price'] ?? $course['price'];
            $this->api->sendMessage(
                $chatId,
                sprintf('<b>%s</b>%s', htmlspecialchars((string) $course['title']), $price ? "\nقیمت: ".number_format((int) $price).' تومان' : ''),
                ['reply_markup' => ['inline_keyboard' => [[[
                    'text' => 'مشاهده و خرید در سایت',
                    'url' => $this->siteBaseUrl.'/courses/'.$course['slug'],
                ]]]]],
            );
        }
    }

    private function sendSeminarList(int $chatId): void
    {
        $seminars = $this->cache->seminars();
        if ($seminars === []) {
            $this->api->sendMessage($chatId, $this->cache->message('seminars_catalog_empty', 'سمیناری برای نمایش نیست.'));

            return;
        }

        foreach (array_slice($seminars, 0, 10) as $seminar) {
            $this->api->sendMessage(
                $chatId,
                sprintf('<b>%s</b>%s', htmlspecialchars((string) $seminar['title']), $seminar['seminar_date'] ? "\n".$seminar['seminar_date'] : ''),
                ['reply_markup' => ['inline_keyboard' => [[[
                    'text' => 'بررسی ظرفیت',
                    'callback_data' => 'seminar:check:'.$seminar['id'],
                ]]]]],
            );
        }
    }

    private function checkSeminarCapacity(int $chatId, int $seminarId): void
    {
        // Never trust the cached capacity_hint for this — always live.
        $result = $this->sync->call('capacity-check', ['seminar_id' => $seminarId]);

        if (empty($result['ok'])) {
            $this->api->sendMessage($chatId, 'بررسی ظرفیت ناموفق بود — دوباره تلاش کنید.');

            return;
        }

        if (! empty($result['is_full'])) {
            $this->api->sendMessage($chatId, 'ظرفیت این سمینار تکمیل شده است.');

            return;
        }

        $remaining = $result['remaining_seats'] ?? null;
        $this->api->sendMessage(
            $chatId,
            'ظرفیت باز است'.($remaining !== null ? " ({$remaining} صندلی باقی‌مانده)" : '').'.',
            ['reply_markup' => ['inline_keyboard' => [[[
                'text' => 'ادامه ثبت‌نام در سایت',
                'url' => $this->siteBaseUrl.'/seminars/'.$seminarId,
            ]]]]],
        );
    }

    private function normalizeMobile(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone) ?? '';
        if (str_starts_with($digits, '98')) {
            $digits = '0'.substr($digits, 2);
        } elseif (! str_starts_with($digits, '0')) {
            $digits = '0'.$digits;
        }

        return $digits;
    }
}
