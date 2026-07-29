<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Telegram\BotApiClient;

/**
 * Deletes Telegram's automatic join / approval service messages in groups.
 * Runs entirely on the foreign host — no Iran round-trip.
 */
final class GroupJoinMessageCleaner
{
    /** @var list<string> */
    private const JOIN_TEXT_NEEDLES = [
        'was accepted into the group',
        'was accepted to the group',
        'was accepted in the group',
        'joined the group',
        'was added to the group',
        'was invited to the group',
        'was invited into the group',
        'your request to join the group was approved',
        'request to join the group was approved',
        'your join request was approved',
        'به گروه پیوست',
        'به گروه اضافه شد',
        'به گروه پذیرفته شد',
        'وارد گروه شد',
        'به گروه دعوت شد',
        'درخواست شما برای پیوستن به گروه تأیید شد',
        'درخواست شما برای پیوستن به گروه تایید شد',
        'درخواست پیوستن شما تأیید شد',
        'درخواست پیوستن شما تایید شد',
    ];

    public function __construct(private readonly BotApiClient $api) {}

    /**
     * @param  array<string, mixed>  $message
     */
    public function tryDeleteJoinMessage(array $message): bool
    {
        if (! $this->isJoinServiceMessage($message)) {
            return false;
        }

        $chatType = (string) ($message['chat']['type'] ?? '');
        if (! in_array($chatType, ['group', 'supergroup'], true)) {
            return false;
        }

        $chatId = $message['chat']['id'] ?? null;
        $messageId = (int) ($message['message_id'] ?? 0);
        if ($chatId === null || $messageId <= 0) {
            return false;
        }

        $this->api->deleteMessage($chatId, $messageId);

        return true;
    }

    /**
     * @param  array<string, mixed>  $message
     */
    private function isJoinServiceMessage(array $message): bool
    {
        if (isset($message['new_chat_members']) && is_array($message['new_chat_members'])) {
            return $message['new_chat_members'] !== [];
        }

        if (isset($message['new_chat_member']) && is_array($message['new_chat_member'])) {
            return true;
        }

        if (! $this->isPlainTextServiceMessage($message)) {
            return false;
        }

        return $this->looksLikeJoinServiceText((string) ($message['text'] ?? ''));
    }

    /**
     * Join/accept lines are bare text — not photos, files, etc.
     *
     * @param  array<string, mixed>  $message
     */
    private function isPlainTextServiceMessage(array $message): bool
    {
        if (trim((string) ($message['text'] ?? '')) === '') {
            return false;
        }

        foreach ([
            'photo', 'video', 'document', 'audio', 'voice', 'sticker', 'animation',
            'poll', 'location', 'contact', 'dice', 'game', 'invoice', 'venue',
        ] as $key) {
            if (isset($message[$key])) {
                return false;
            }
        }

        return true;
    }

    private function looksLikeJoinServiceText(string $text): bool
    {
        $normalized = mb_strtolower(trim($text));
        if ($normalized === '') {
            return false;
        }

        foreach (self::JOIN_TEXT_NEEDLES as $needle) {
            if (str_contains($normalized, mb_strtolower($needle))) {
                return true;
            }
        }

        return false;
    }
}
