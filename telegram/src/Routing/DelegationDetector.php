<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Account\AccountCache;
use TelegramHost\Conversation\ConversationRepository;

/**
 * Decides which updates should be relayed to Iran in the background (never blocks the user).
 */
final class DelegationDetector
{
    /** @var list<string> */
    private const SERVER_STATES = [
        'waiting_for_terms',
        'waiting_for_name',
        'waiting_for_mobile',
        'confirming_registration',
        'waiting_for_otp',
        'filling_sat_application',
        'waiting_for_card_to_card_receipt',
        'waiting_for_support_message',
        'admin_panel',
        'admin_waiting_input',
    ];

    public function __construct(
        private readonly AccountCache $accounts,
        private readonly ConversationRepository $conversations,
    ) {}

    /** @param array<string, mixed> $update */
    public function shouldRelayToIran(array $update): bool
    {
        if (isset($update['my_chat_member']) || isset($update['chat_member']) || isset($update['chat_join_request'])) {
            return true;
        }

        if (isset($update['edited_message'])) {
            return true;
        }

        $telegramUserId = $this->telegramUserId($update);
        if ($telegramUserId <= 0) {
            return false;
        }

        if ($this->accounts->isBotAdmin($telegramUserId)) {
            return true;
        }

        if (! $this->accounts->isVerified($telegramUserId)) {
            return true;
        }

        $conversation = $this->conversations->get($telegramUserId);
        if (in_array($conversation['state'], self::SERVER_STATES, true)) {
            return true;
        }

        $callbackData = (string) ($update['callback_query']['data'] ?? '');
        if (str_starts_with($callbackData, 'c2c:ok:') || str_starts_with($callbackData, 'c2c:no:')) {
            return true;
        }

        if (str_starts_with($callbackData, 'reg:')) {
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
