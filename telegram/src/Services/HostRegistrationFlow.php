<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Account\PendingMobileAccess;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\SyncClient;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\MobileNormalizer;
use TelegramHost\Telegram\BotApiClient;

/**
 * Registration on the external host — Iran API for data, host sends all Telegram messages.
 */
final class HostRegistrationFlow
{
    public function __construct(
        private readonly SyncClient $sync,
        private readonly BotApiClient $api,
        private readonly AccountCache $accounts,
        private readonly ConversationRepository $conversations,
        private readonly MainMenu $mainMenu,
        private readonly SyncCache $cache,
        private readonly AccountSyncCoordinator $accountSync,
        private readonly ?PendingMobileAccess $pendingMobileAccess = null,
    ) {}

    /**
     * Keep Iran sync tight. A long ACK+wait (old 8s path) felt broken: user
     * saw "در حال احراز هویت…" then another message, then sometimes the menu.
     * On timeout we finish locally; known users still get Iran's replies when
     * the call lands within this window (local Laravel is usually <200ms).
     */
    private const REGISTRATION_TIMEOUT_SECONDS = 3;

    /**
     * Welcome + phone keyboard from host MySQL only (no registration/start API).
     */
    public function showLocalWelcome(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);

        $text = $this->cache->message(
            'registration_ask_mobile',
            "📱 تأیید شماره موبایل\n\n"
            ."برای ادامه ثبت‌نام، شماره موبایل ایران خود را تأیید کنید.\n\n"
            ."👇 منوی پایین صفحه را باز کنید و روی «ارسال شماره تماس» بزنید.\n"
            ."❗️ شماره را تایپ نکنید — فقط همان دکمه.",
        );

        $this->sendPhoneStepMessage($chatId, $text);
    }

    /** @param array<string, mixed> $extraOptions */
    private function sendPhoneStepMessage(int $chatId, string $text, array $extraOptions = []): void
    {
        $result = $this->api->sendMessageResult($chatId, $text, array_merge([
            'parse_mode' => 'HTML',
            'reply_markup' => InlineButtons::shareContactReplyMarkup(),
        ], $extraOptions));

        $messageId = (int) ($result['message_id'] ?? 0);
        if ($messageId > 0) {
            $this->api->editMessageReplyMarkup($chatId, $messageId, InlineButtons::shareContactInlineMarkup());
        }
    }

    /**
     * @param  array<string, mixed>  $from
     * @deprecated Use showLocalWelcome after account pull; Iran API only on contact/name.
     */
    public function start(int $chatId, int $telegramUserId, array $from = [], ?string $startPayload = null): void
    {
        $this->showLocalWelcome($chatId, $telegramUserId);
    }

    /** @param array<string, mixed> $contact */
    public function contact(int $chatId, int $telegramUserId, array $contact): void
    {
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->showMainMenu($chatId, $telegramUserId);

            return;
        }

        $rawPhone = trim((string) ($contact['phone_number'] ?? ''));
        $contactUserId = (int) ($contact['user_id'] ?? 0);

        // Telegram delivers Iranian numbers as "989xxxxxxxxx" (no leading
        // "0"/"+"). Normalize to the canonical "09xxxxxxxxx" local format —
        // the same format Iran stores/keys by — before it's used for the
        // pending-access lookup below, sent to Iran, or stored locally.
        $phone = MobileNormalizer::normalizeOrOriginal($rawPhone);

        // Access already purchased on the website (before this /start) may
        // have been pre-provisioned by Iran, keyed by mobile — merge it in
        // right away, from local DB only, regardless of whether Iran is
        // reachable for the registration call below. This is what makes
        // "دسترسی به محض استارت" work even when Iran is briefly unreachable.
        $pending = $this->mergePendingAccessByMobile($telegramUserId, $phone);

        if ($this->tryShowVerifiedLocalAccount($chatId, $telegramUserId, $phone)) {
            return;
        }

        // No "⏳ verifying…" ACK: that added a full Bot-API RTT (via foreign
        // proxy) before Iran even ran, so users got 2–3 staggered messages.
        // Try Iran first (short timeout); one apply() batch of replies. If
        // Iran is down, a single ask-name message — never a loading stub.
        try {
            $response = $this->sync->call('registration/contact', [
                'telegram_user_id' => $telegramUserId,
                'phone' => $phone,
                'contact_user_id' => $contactUserId,
            ], self::REGISTRATION_TIMEOUT_SECONDS, allowRetry: false);
            $this->apply($chatId, $telegramUserId, $response);

            return;
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/contact: '.$e->getMessage());
        }

        $knownName = $this->resolveLocalStudentName($telegramUserId, $phone, $pending);
        if ($knownName !== '') {
            $this->finishLocalRegistration($chatId, $telegramUserId, $phone, $knownName);

            return;
        }

        $this->accounts->storePendingContact($telegramUserId, $phone);
        $this->conversations->set($telegramUserId, 'waiting_for_name', [
            'mobile' => $phone,
            'contact_user_id' => $contactUserId,
        ]);
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_ask_name_offline',
            'شماره شما ثبت شد. لطفاً نام و نام خانوادگی خود را بفرستید تا ادامه دهیم.',
        ), ['reply_markup' => ['remove_keyboard' => true]]);
    }

    /** @return array{owned_product_ids: list<int>, display_name: ?string}|null */
    private function mergePendingAccessByMobile(int $telegramUserId, string $mobile): ?array
    {
        if ($mobile === '' || $this->pendingMobileAccess === null) {
            return null;
        }

        try {
            $pending = $this->pendingMobileAccess->get($mobile);
            if ($pending !== null) {
                $this->accounts->mergeOwnedProductIds(
                    $telegramUserId,
                    $pending['owned_product_ids'],
                    $pending['display_name'],
                );
            }

            return $pending;
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access merge: '.$e->getMessage());

            return null;
        }
    }

    /** @param array{owned_product_ids: list<int>, display_name: ?string}|null $pending */
    private function resolveLocalStudentName(int $telegramUserId, string $mobile, ?array $pending): string
    {
        if ($pending !== null) {
            $name = trim((string) ($pending['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        $account = $this->accounts->get($telegramUserId);
        if ($account !== null) {
            $name = trim((string) ($account['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        $byMobile = $this->accounts->findVerifiedByMobile($mobile, $telegramUserId);
        if ($byMobile !== null) {
            $name = trim((string) ($byMobile['display_name'] ?? ''));
            if ($name !== '') {
                return $name;
            }
        }

        return '';
    }

    private function finishLocalRegistration(int $chatId, int $telegramUserId, string $mobile, string $displayName): void
    {
        $this->accounts->storeLocalOnlyRegistration($telegramUserId, $mobile, $displayName);
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage($chatId, $this->cache->message(
            'main_menu_hint',
            'ثبت‌نام شما ثبت شد. منوی اصلی آکادمی بهرام',
        ), [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
    }

    private function tryShowVerifiedLocalAccount(int $chatId, int $telegramUserId, string $mobile): bool
    {
        $account = $this->accounts->get($telegramUserId);
        if ($account !== null
            && ! empty($account['mobile_verified_at'])
            && trim((string) ($account['mobile'] ?? '')) === $mobile) {
            $this->showMainMenu($chatId, $telegramUserId);

            return true;
        }

        return false;
    }

    private function showMainMenu(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'منوی اصلی آکادمی بهرام'), [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
    }

    public function name(int $chatId, int $telegramUserId, string $name): void
    {
        // Same as contact(): no loading stub — one Iran round-trip then replies,
        // or a single local menu if Iran is unreachable.
        try {
            $response = $this->sync->call('registration/name', [
                'telegram_user_id' => $telegramUserId,
                'name' => $name,
            ], self::REGISTRATION_TIMEOUT_SECONDS, allowRetry: false);
            $this->apply($chatId, $telegramUserId, $response);

            return;
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/name: '.$e->getMessage());
        }

        $conversation = $this->conversations->get($telegramUserId);
        $mobile = (string) ($conversation['context']['mobile'] ?? '');
        $this->finishLocalRegistration($chatId, $telegramUserId, $mobile, $name);
    }

    public function callback(int $chatId, int $telegramUserId, string $data): void
    {
        try {
            $response = $this->sync->call('registration/callback', [
                'telegram_user_id' => $telegramUserId,
                'callback_data' => $data,
            ]);
            $this->apply($chatId, $telegramUserId, $response);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/callback: '.$e->getMessage());
        }
    }

    public function verifyOtp(int $chatId, int $telegramUserId, string $mobile, string $code, string $displayName = ''): void
    {
        try {
            $response = $this->sync->call('otp/verify', [
                'telegram_user_id' => $telegramUserId,
                'mobile' => $mobile,
                'code' => $code,
                'display_name' => $displayName,
            ], self::REGISTRATION_TIMEOUT_SECONDS, allowRetry: false);
            if (empty($response['ok'])) {
                $this->api->sendMessage($chatId, (string) ($response['message'] ?? 'کد نامعتبر است.'));

                return;
            }
            if (is_array($response['account'] ?? null)) {
                $this->accounts->store($telegramUserId, $response['account']);
            } else {
                $fetch = $this->sync->call('account/fetch', [
                    'telegram_user_id' => $telegramUserId,
                    'include_snapshot' => true,
                ]);
                if (! empty($fetch['found']) && is_array($fetch['account'] ?? null)) {
                    $this->accounts->store($telegramUserId, $fetch['account']);
                }
            }
            $this->conversations->set($telegramUserId, 'idle', []);
            $this->api->sendMessage($chatId, $this->cache->message('main_menu_hint', 'منوی اصلی آکادمی بهرام'), [
                'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
            ]);
            $summary = $response['summary_lines'] ?? [];
            if (is_array($summary) && $summary !== []) {
                $this->api->sendMessage($chatId, implode("\n", array_map('strval', $summary)));
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] otp/verify: '.$e->getMessage());
            $this->api->sendMessage($chatId, 'تایید کد انجام نشد. دوباره تلاش کنید.');
        }
    }

    /** @param array<string, mixed> $response */
    private function apply(int $chatId, int $telegramUserId, array $response): void
    {
        if (empty($response['ok'])) {
            $this->api->sendMessage($chatId, (string) ($response['message'] ?? 'خطا در ثبت‌نام.'));

            return;
        }

        if (is_array($response['conversation'] ?? null)) {
            $conv = $response['conversation'];
            $this->conversations->set(
                $telegramUserId,
                (string) ($conv['state'] ?? 'idle'),
                is_array($conv['context'] ?? null) ? $conv['context'] : [],
            );
        }

        if (is_array($response['account'] ?? null)) {
            $this->accounts->store($telegramUserId, $response['account']);
        }

        $replies = $response['replies'] ?? [];
        if (! is_array($replies)) {
            return;
        }

        foreach ($replies as $reply) {
            if (! is_array($reply)) {
                continue;
            }
            try {
                $this->sendReply($chatId, $telegramUserId, $reply);
            } catch (\Throwable $e) {
                error_log('[telegram-host] registration reply: '.$e->getMessage());
            }
        }
    }

    /** @param array<string, mixed> $reply */
    private function sendReply(int $chatId, int $telegramUserId, array $reply): void
    {
        $text = (string) ($reply['text'] ?? '');
        if ($text === '') {
            return;
        }

        $options = [];
        if (isset($reply['parse_mode'])) {
            $options['parse_mode'] = (string) $reply['parse_mode'];
        }
        if (! empty($reply['remove_keyboard'])) {
            $options['reply_markup'] = ['remove_keyboard' => true];
        } elseif (! empty($reply['show_main_menu'])) {
            $options['reply_markup'] = $this->mainMenu->replyMarkup($telegramUserId);
        } elseif (isset($reply['reply_markup']) && is_array($reply['reply_markup'])) {
            $options['reply_markup'] = $reply['reply_markup'];
        }

        $inlineMarkup = isset($reply['inline_markup']) && is_array($reply['inline_markup'])
            ? $reply['inline_markup']
            : null;

        $result = $this->api->sendMessageResult($chatId, $text, $options);

        if ($inlineMarkup !== null) {
            $messageId = (int) ($result['message_id'] ?? 0);
            if ($messageId > 0) {
                $this->api->editMessageReplyMarkup($chatId, $messageId, $inlineMarkup);
            }
        }
    }
}
