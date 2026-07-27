<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Account\AccountCache;
use TelegramHost\Conversation\ConversationRepository;

/**
 * Decides which updates should be relayed to Iran in the background (never blocks the user).
 *
 * Support + SAT form + discount preview run locally. Admin panel shell is local;
 * only admin_panel / C2C receipt states sync-relay for live data.
 */
final class DelegationDetector
{
    /** @var list<string> */
    private const SERVER_STATES = [
        'waiting_for_terms',
        'waiting_for_mobile',
        'confirming_registration',
        'waiting_for_card_to_card_receipt',
        'admin_panel',
        'admin_waiting_input',
    ];

    public function __construct(
        private readonly AccountCache $accounts,
        private readonly ConversationRepository $conversations,
    ) {}

    public function shouldRelayToIran(array $update): bool
    {
        if (isset($update['my_chat_member']) || isset($update['chat_member']) || isset($update['chat_join_request'])) {
            return true;
        }

        if (isset($update['edited_message'])) {
            return true;
        }

        // Group/channel traffic (except reports-group support, handled locally first).
        if (! $this->isPrivateUserFacing($update)) {
            return true;
        }

        $telegramUserId = $this->telegramUserId($update);
        if ($telegramUserId <= 0) {
            return false;
        }

        if (! $this->accounts->isVerified($telegramUserId)) {
            if ($this->isPrivateUserFacing($update)) {
                return false;
            }
        }

        $conversation = $this->conversations->get($telegramUserId);
        if (in_array($conversation['state'], self::SERVER_STATES, true)) {
            return true;
        }

        // OTP verification still needs Iran when that flow is active.
        if ($conversation['state'] === 'waiting_for_otp' || $conversation['state'] === 'waiting_for_name') {
            // Host registration handles these locally via HostRegistrationFlow + sync OTP APIs.
            return false;
        }

        $callbackData = (string) ($update['callback_query']['data'] ?? '');
        if (str_starts_with($callbackData, 'c2c:ok:') || str_starts_with($callbackData, 'c2c:no:')) {
            return true;
        }

        return false;
    }

    /**
     * Synchronous live relay — only when Iran must answer immediately (admin panel / C2C).
     *
     * @param array<string, mixed> $update
     */
    public function shouldTrySyncRelayToIran(array $update): bool
    {
        if (! $this->shouldRelayToIran($update) || ! $this->isPrivateUserFacing($update)) {
            return false;
        }

        $telegramUserId = $this->telegramUserId($update);
        if ($telegramUserId <= 0) {
            return false;
        }

        $conversation = $this->conversations->get($telegramUserId);
        // Exit admin locally — do not block on Iran for «خروج».
        $text = trim((string) ($update['message']['text'] ?? ''));
        if (in_array($conversation['state'], ['admin_panel', 'admin_waiting_input'], true)
            && in_array($text, ['خروج از پنل ادمین', '❌ خروج از پنل ادمین'], true)) {
            return false;
        }

        if (in_array($conversation['state'], ['admin_panel', 'admin_waiting_input', 'waiting_for_card_to_card_receipt'], true)) {
            return true;
        }

        $callbackData = (string) ($update['callback_query']['data'] ?? '');
        if (str_starts_with($callbackData, 'c2c:ok:') || str_starts_with($callbackData, 'c2c:no:')) {
            return true;
        }

        return false;
    }

    /** @param array<string, mixed> $update */
    public function isPrivateUserFacing(array $update): bool
    {
        if (isset($update['callback_query'])) {
            return true;
        }

        if (isset($update['message'])) {
            $type = (string) ($update['message']['chat']['type'] ?? 'private');

            return $type === 'private';
        }

        return false;
    }

    /** @param array<string, mixed> $update */
    private function telegramUserId(array $update): int
    {
        foreach (['message', 'callback_query', 'edited_message'] as $key) {
            $id = (int) ($update[$key]['from']['id'] ?? 0);
            if ($id > 0) {
                return $id;
            }
        }

        return 0;
    }
}
