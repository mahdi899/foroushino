<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Conversation\ConversationRepository;
use TelegramHost\Http\SyncClient;
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
    ) {}

    /**
     * @param  array<string, mixed>  $from
     */
    public function start(int $chatId, int $telegramUserId, array $from = [], ?string $startPayload = null): void
    {
        try {
            $response = $this->sync->call('registration/start', array_filter([
                'telegram_user_id' => $telegramUserId,
                'from' => $from,
                'start_payload' => $startPayload,
            ]));
            $this->apply($chatId, $telegramUserId, $response);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/start: '.$e->getMessage());
            $this->api->sendMessage($chatId, 'اتصال به سرور ثبت‌نام برقرار نشد. چند لحظه بعد دوباره /start بزنید.');
        }
    }

    /** @param array<string, mixed> $contact */
    public function contact(int $chatId, int $telegramUserId, array $contact): void
    {
        $phone = trim((string) ($contact['phone_number'] ?? ''));
        $contactUserId = (int) ($contact['user_id'] ?? 0);

        try {
            $response = $this->sync->call('registration/contact', [
                'telegram_user_id' => $telegramUserId,
                'phone' => $phone,
                'contact_user_id' => $contactUserId,
            ]);
            $this->apply($chatId, $telegramUserId, $response);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/contact: '.$e->getMessage());
            $this->api->sendMessage($chatId, 'ثبت شماره انجام نشد. اتصال به سرور اصلی را بررسی کنید و دوباره تلاش کنید.');
        }
    }

    public function name(int $chatId, int $telegramUserId, string $name): void
    {
        try {
            $response = $this->sync->call('registration/name', [
                'telegram_user_id' => $telegramUserId,
                'name' => $name,
            ]);
            $this->apply($chatId, $telegramUserId, $response);
        } catch (\Throwable $e) {
            error_log('[telegram-host] registration/name: '.$e->getMessage());
            $this->api->sendMessage($chatId, 'ذخیره نام انجام نشد. دوباره تلاش کنید.');
        }
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
            ]);
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
            $this->sendReply($chatId, $telegramUserId, $reply);
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
