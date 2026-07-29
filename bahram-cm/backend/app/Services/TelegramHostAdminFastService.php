<?php

namespace App\Services;

use App\Modules\TelegramBot\Enums\ConversationState;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Services\AdminMenuKeyboard;
use App\Modules\TelegramBot\Services\BotAdminPanelService;
use App\Modules\TelegramBot\Services\ConversationService;
use Illuminate\Support\Facades\Config;
use RuntimeException;
use Throwable;

/**
 * Lightweight admin path for the external Telegram host — skips telegram_updates
 * ingest + queue and sends replies synchronously so the host HTTP call finishes
 * as soon as the panel logic runs.
 */
class TelegramHostAdminFastService
{
    public function __construct(
        private readonly BotAdminPanelService $adminPanel,
        private readonly ConversationService $conversations,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{ok: bool, message?: string, conversation?: array{state: string, context: array<string, mixed>}, elapsed_ms?: int}
     */
    public function dispatch(TelegramBot $bot, array $payload): array
    {
        $started = hrtime(true);
        $previousSync = Config::get('telegram_bot.outbound_sync');
        Config::set('telegram_bot.outbound_sync', true);

        try {
            $kind = (string) ($payload['kind'] ?? '');
            $telegramUserId = (int) ($payload['telegram_user_id'] ?? 0);
            $chatId = (int) ($payload['chat_id'] ?? $telegramUserId);

            if ($telegramUserId <= 0 || $chatId === 0) {
                return ['ok' => false, 'message' => 'invalid_user'];
            }

            $account = TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->where('telegram_user_id', $telegramUserId)
                ->first();

            if ($account === null || ! $account->isBotAdmin()) {
                return ['ok' => false, 'message' => 'not_admin'];
            }

            match ($kind) {
                'open' => $this->adminPanel->openDashboard($bot, $account, $chatId),
                'text' => $this->dispatchText($bot, $account, $chatId, (string) ($payload['text'] ?? '')),
                'callback' => $this->dispatchCallback($bot, $account, $payload, $chatId),
                'photo' => $this->dispatchPhoto($bot, $account, $payload, $chatId),
                default => throw new RuntimeException('unknown_kind'),
            };

            $conversation = $this->conversations->forAccount($account);

            return [
                'ok' => true,
                'conversation' => [
                    'state' => $conversation->state->value,
                    'context' => (array) ($conversation->context ?? []),
                ],
                'elapsed_ms' => (int) ((hrtime(true) - $started) / 1_000_000),
            ];
        } catch (Throwable $e) {
            report($e);

            return [
                'ok' => false,
                'message' => $e->getMessage(),
                'elapsed_ms' => (int) ((hrtime(true) - $started) / 1_000_000),
            ];
        } finally {
            Config::set('telegram_bot.outbound_sync', $previousSync);
        }
    }

    private function dispatchText(TelegramBot $bot, TelegramAccount $account, int $chatId, string $text): void
    {
        $text = trim($text);
        if ($text === '') {
            throw new RuntimeException('empty_text');
        }

        $conversation = $this->conversations->forAccount($account);

        if ($conversation->state !== ConversationState::AdminPanel
            && $conversation->state !== ConversationState::AdminWaitingInput
            && app(AdminMenuKeyboard::class)->isMenuButton($text, $account)) {
            $this->conversations->transition($conversation, ConversationState::AdminPanel, [
                'admin' => ['flow' => null, 'draft' => []],
            ]);
            $conversation = $conversation->fresh() ?? $conversation;
        }

        if (! $this->adminPanel->handleTextInput($bot, $account, $conversation, $chatId, $text)) {
            throw new RuntimeException('text_not_handled');
        }
    }

    /** @param array<string, mixed> $payload */
    private function dispatchCallback(TelegramBot $bot, TelegramAccount $account, array $payload, int $chatId): void
    {
        $data = (string) ($payload['callback_data'] ?? '');
        $messageId = (int) ($payload['message_id'] ?? 0);
        $callbackId = (string) ($payload['callback_id'] ?? 'host-fast');

        if ($data === '' || ! str_starts_with($data, 'admin:')) {
            throw new RuntimeException('invalid_callback');
        }

        $handled = $this->adminPanel->handleCallback(
            $bot,
            $account,
            $data,
            $chatId,
            $messageId,
            $callbackId,
        );

        if (! $handled) {
            throw new RuntimeException('callback_not_handled');
        }
    }

    /** @param array<string, mixed> $payload */
    private function dispatchPhoto(TelegramBot $bot, TelegramAccount $account, array $payload, int $chatId): void
    {
        $fileId = (string) ($payload['file_id'] ?? '');
        if ($fileId === '') {
            throw new RuntimeException('file_id_missing');
        }

        $conversation = $this->conversations->forAccount($account);
        $message = [
            'photo' => [['file_id' => $fileId]],
        ];

        if (! $this->adminPanel->handlePhotoInput($bot, $account, $conversation, $chatId, $message)) {
            throw new RuntimeException('photo_not_handled');
        }
    }
}
