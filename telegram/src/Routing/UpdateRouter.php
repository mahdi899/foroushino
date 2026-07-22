<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Handlers\CallbackQueryHandler;
use TelegramHost\Handlers\MessageHandler;
use TelegramHost\Http\LiveClient;
use TelegramHost\Http\SyncClient;
use TelegramHost\Telegram\BotApiClient;
use TelegramHost\Support\TelegramCustomEmoji;

final class UpdateRouter
{
    public function __construct(
        private readonly DelegationDetector $delegation,
        private readonly LiveClient $live,
        private readonly SyncClient $sync,
        private readonly AccountCache $accounts,
        private readonly SyncCache $cache,
        private readonly BotApiClient $api,
        private readonly MessageHandler $messages,
        private readonly CallbackQueryHandler $callbacks,
    ) {}

    /** @param array<string, mixed> $update */
    public function handle(array $update): void
    {
        if ($this->delegation->shouldDelegate($update)) {
            $this->live->processUpdate($update);
            $this->refreshAccountCache($this->extractTelegramUserId($update));

            return;
        }

        $telegramUserId = $this->extractTelegramUserId($update);
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

    private function refreshAccountCache(int $telegramUserId): void
    {
        if ($telegramUserId <= 0) {
            return;
        }

        $fresh = $this->sync->call('account/fetch', ['telegram_user_id' => $telegramUserId]);
        if (! empty($fresh['found']) && is_array($fresh['account'] ?? null)) {
            $this->accounts->store($telegramUserId, $fresh['account']);
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
