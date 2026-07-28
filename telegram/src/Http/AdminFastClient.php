<?php

declare(strict_types=1);

namespace TelegramHost\Http;

use TelegramHost\Conversation\ConversationRepository;

/**
 * Calls Iran live/admin/fast — skips full process-update ingest for admin UX.
 */
final class AdminFastClient
{
    /** @param array<string, mixed> $config */
    public function __construct(
        private readonly SyncClient $sync,
        private readonly array $config,
        private readonly ConversationRepository $conversations,
    ) {}

    public function enabled(): bool
    {
        if (($this->config['admin_fast_api'] ?? true) === false) {
            return false;
        }

        return true;
    }

    /**
     * @param array<string, mixed> $update
     */
    public function tryDispatch(int $chatId, int $telegramUserId, array $update): bool
    {
        if (! $this->enabled()) {
            return false;
        }

        $conversation = $this->conversations->get($telegramUserId);
        if (! in_array($conversation['state'], ['admin_panel', 'admin_waiting_input'], true)) {
            return false;
        }

        $payload = $this->buildPayload($chatId, $telegramUserId, $update);
        if ($payload === null) {
            return false;
        }

        $timeout = isset($payload['kind']) && $payload['kind'] === 'photo' ? 25 : 12;

        try {
            $result = $this->sync->call('live/admin/fast', $payload, $timeout, false);
        } catch (\Throwable) {
            return false;
        }

        if (! ($result['ok'] ?? false)) {
            return false;
        }

        $conv = $result['conversation'] ?? null;
        if (is_array($conv) && isset($conv['state'])) {
            $this->conversations->set(
                $telegramUserId,
                (string) $conv['state'],
                is_array($conv['context'] ?? null) ? (array) $conv['context'] : [],
            );
        }

        if (isset($result['elapsed_ms'])) {
            error_log('[telegram-host] admin/fast ok in '.(int) $result['elapsed_ms'].'ms kind='.($payload['kind'] ?? '?'));
        }

        return true;
    }

    public function openDashboard(int $chatId, int $telegramUserId): bool
    {
        if (! $this->enabled()) {
            return false;
        }

        try {
            $result = $this->sync->call('live/admin/fast', [
                'kind' => 'open',
                'telegram_user_id' => $telegramUserId,
                'chat_id' => $chatId,
            ], 12, false);
        } catch (\Throwable) {
            return false;
        }

        if (! ($result['ok'] ?? false)) {
            return false;
        }

        $conv = $result['conversation'] ?? null;
        if (is_array($conv) && isset($conv['state'])) {
            $this->conversations->set(
                $telegramUserId,
                (string) $conv['state'],
                is_array($conv['context'] ?? null) ? (array) $conv['context'] : [],
            );
        }

        return true;
    }

    /**
     * @param array<string, mixed> $update
     * @return array<string, mixed>|null
     */
    private function buildPayload(int $chatId, int $telegramUserId, array $update): ?array
    {
        if (isset($update['callback_query']) && is_array($update['callback_query'])) {
            $cb = $update['callback_query'];
            $data = (string) ($cb['data'] ?? '');
            if (! str_starts_with($data, 'admin:')) {
                return null;
            }

            return [
                'kind' => 'callback',
                'telegram_user_id' => $telegramUserId,
                'chat_id' => $chatId,
                'callback_data' => $data,
                'callback_id' => (string) ($cb['id'] ?? 'host-fast'),
                'message_id' => (int) ($cb['message']['message_id'] ?? 0),
            ];
        }

        if (! isset($update['message']) || ! is_array($update['message'])) {
            return null;
        }

        $message = $update['message'];

        if (isset($message['photo']) && is_array($message['photo']) && $message['photo'] !== []) {
            $largest = $message['photo'][array_key_last($message['photo'])];

            return [
                'kind' => 'photo',
                'telegram_user_id' => $telegramUserId,
                'chat_id' => $chatId,
                'file_id' => (string) ($largest['file_id'] ?? ''),
            ];
        }

        $text = trim((string) ($message['text'] ?? ''));
        if ($text === '') {
            return null;
        }

        return [
            'kind' => 'text',
            'telegram_user_id' => $telegramUserId,
            'chat_id' => $chatId,
            'text' => $text,
        ];
    }
}
