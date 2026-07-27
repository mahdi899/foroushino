<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Account\PendingMobileAccess;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\SyncClient;
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
     * Short enough that a slow/unreachable Iran never makes the user feel a
     * lag — on timeout we fall back to finishing registration locally (see
     * contact()/name()) instead of making them wait or showing an error.
     */
    private const REGISTRATION_TIMEOUT_SECONDS = 8;

    /**
     * Welcome + phone keyboard from host MySQL only (no registration/start API).
     */
    public function showLocalWelcome(int $chatId, int $telegramUserId): void
    {
        $this->conversations->set($telegramUserId, 'waiting_for_mobile', []);

        $text = $this->cache->message(
            'registration_ask_mobile',
            "به ربات آکادمی بهرام خوش آمدید.\n\nبرای ادامه، شماره موبایل را با دکمه زیر بفرستید.",
        );

        $this->api->sendMessage($chatId, $text, [
            'parse_mode' => 'HTML',
            'reply_markup' => [
                'keyboard' => [[[
                    'text' => '📱 ارسال شماره تماس',
                    'request_contact' => true,
                ]]],
                'resize_keyboard' => true,
                'one_time_keyboard' => true,
            ],
        ]);
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

        // Immediate ACK — Iran round-trip can take a few seconds (geo +
        // encrypt + DB). Without this the chat looks frozen and users think
        // the bot is dead.
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_verifying',
            "⏳ شماره دریافت شد.\nدر حال احراز هویت و دریافت اطلاعات شما از سرور…",
        ), ['reply_markup' => ['remove_keyboard' => true]]);

        // Access already purchased on the website (before this /start) may
        // have been pre-provisioned by Iran, keyed by mobile — merge it in
        // right away, from local DB only, regardless of whether Iran is
        // reachable for the registration call below. This is what makes
        // "دسترسی به محض استارت" work even when Iran is briefly unreachable.
        $this->mergePendingAccessByMobile($telegramUserId, $phone);

        try {
            // No SyncClient retry here: a second multi-second hang after the
            // ACK still feels broken. Prefer the offline-name path quickly.
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

        // Iran unreachable within the short timeout above — don't leave the
        // user stuck or show an error. Store the phone locally and continue
        // the form (name) right away; the account is reconciled with Iran in
        // the background once it's reachable again.
        $this->accounts->storePendingContact($telegramUserId, $phone);
        $this->conversations->set($telegramUserId, 'waiting_for_name', [
            'mobile' => $phone,
            'contact_user_id' => $contactUserId,
        ]);
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_ask_name_offline',
            'شماره شما ثبت شد. لطفاً نام و نام خانوادگی خود را بفرستید تا ادامه دهیم.',
        ));
    }

    private function mergePendingAccessByMobile(int $telegramUserId, string $mobile): void
    {
        if ($mobile === '' || $this->pendingMobileAccess === null) {
            return;
        }

        try {
            $pending = $this->pendingMobileAccess->get($mobile);
            if ($pending !== null && $pending['owned_product_ids'] !== []) {
                $this->accounts->mergeOwnedProductIds(
                    $telegramUserId,
                    $pending['owned_product_ids'],
                    $pending['display_name'],
                );
            }
        } catch (\Throwable $e) {
            error_log('[telegram-host] pending mobile access merge: '.$e->getMessage());
        }
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
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_syncing',
            '⏳ در حال تکمیل ثبت‌نام و همگام‌سازی اطلاعات شما…',
        ));

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

        // Iran unreachable — finish registration locally right away so the
        // user isn't stuck waiting or forced to restart; a background account
        // sync reconciles the real record once Iran is reachable again.
        $conversation = $this->conversations->get($telegramUserId);
        $mobile = (string) ($conversation['context']['mobile'] ?? '');
        $this->accounts->storeLocalOnlyRegistration($telegramUserId, $mobile, $name);
        $this->conversations->set($telegramUserId, 'idle', []);
        $this->api->sendMessage($chatId, $this->cache->message(
            'main_menu_hint',
            'ثبت‌نام شما ثبت شد. منوی اصلی آکادمی بهرام',
        ), [
            'reply_markup' => $this->mainMenu->replyMarkup($telegramUserId),
        ]);
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
        $this->api->sendMessage($chatId, $this->cache->message(
            'registration_verifying_otp',
            '⏳ در حال تایید کد و دریافت اطلاعات حساب…',
        ));

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

        $this->api->sendMessage($chatId, $text, $options);
    }
}
