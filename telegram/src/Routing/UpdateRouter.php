<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Account\AccountCache;
use TelegramHost\Account\AccountSyncCoordinator;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Handlers\CallbackQueryHandler;
use TelegramHost\Handlers\MessageHandler;
use TelegramHost\Telegram\BotApiClient;
use TelegramHost\Support\TelegramCustomEmoji;

/** Local MySQL first; Iran is optional sync/queue — users never see "main server down". */
final class UpdateRouter
{
    public function __construct(
        private readonly DelegationDetector $delegation,
        private readonly IranSyncRelay $iranSync,
        private readonly AccountCache $accounts,
        private readonly AccountSyncCoordinator $accountSync,
        private readonly SyncCache $cache,
        private readonly BotApiClient $api,
        private readonly MessageHandler $messages,
        private readonly CallbackQueryHandler $callbacks,
    ) {}

    /** @param array<string, mixed> $update */
    public function handle(array $update): void
    {
        if ($this->delegation->shouldRelayToIran($update)) {
            $this->iranSync->enqueue($update);

            if (! $this->delegation->isPrivateUserFacing($update)) {
                return;
            }

            if ($this->delegation->shouldTrySyncRelayToIran($update)) {
                $telegramUserId = $this->extractTelegramUserId($update);
                $chatId = $this->extractChatId($update);
                if ($this->iranSync->tryRelay($chatId, $telegramUserId, $update)) {
                    return;
                }
            }
        }

        if (! $this->delegation->isPrivateUserFacing($update)) {
            return;
        }

        $telegramUserId = $this->extractTelegramUserId($update);
        if ($telegramUserId > 0) {
            try {
                $this->accountSync->ensureFresh($telegramUserId);
            } catch (\Throwable $e) {
                error_log('[telegram-host] account sync skipped: '.$e->getMessage());
            }
        }

        if ($telegramUserId > 0 && ! $this->cache->botIsActive() && ! $this->accounts->isBotAdmin($telegramUserId)) {
            $chatId = $this->extractChatId($update);
            if ($chatId > 0) {
                $this->api->sendMessage($chatId, TelegramCustomEmoji::tag('warning').' ربات موقتاً غیرفعال است. لطفاً بعداً دوباره تلاش کنید.');
            }

            return;
        }

        if (isset($update['message'])) {
            $this->messages->handle($update['message']);

            return;
        }

        if (isset($update['callback_query'])) {
            $this->callbacks->handle($update['callback_query']);
        }
    }

    /** @param array<string, mixed> $update */
    private function extractTelegramUserId(array $update): int
    {
        foreach (['message', 'callback_query', 'edited_message'] as $key) {
            $id = (int) ($update[$key]['from']['id'] ?? 0);
            if ($id > 0) {
                return $id;
            }
        }

        return 0;
    }

    /** @param array<string, mixed> $update */
    private function extractChatId(array $update): int
    {
        if (isset($update['message']['chat']['id'])) {
            return (int) $update['message']['chat']['id'];
        }

        if (isset($update['callback_query']['message']['chat']['id'])) {
            return (int) $update['callback_query']['message']['chat']['id'];
        }

        return $this->extractTelegramUserId($update);
    }
}
