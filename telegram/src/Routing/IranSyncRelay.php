<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Http\LiveClient;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Services\IranFailureReporter;
use TelegramHost\Services\IranOfflineUserMessage;
use TelegramHost\Telegram\BotApiClient;

/** Synchronous relay of an update to Iran during the webhook (with typing + outage UX). */
final class IranSyncRelay
{
    public function __construct(
        private readonly LiveClient $live,
        private readonly BotApiClient $api,
        private readonly IranUpdateQueue $queue,
        private readonly IranFailureReporter $reporter,
        private readonly IranOfflineUserMessage $offlineMessages,
    ) {}

    /**
     * @param array<string, mixed> $update
     */
    public function relayOrNotify(int $chatId, int $telegramUserId, array $update): bool
    {
        if ($chatId !== 0) {
            $this->api->sendChatAction($chatId, 'typing');
        }

        try {
            $result = $this->live->processUpdate($update);
            if (! empty($result['ok']) || ! array_key_exists('ok', $result)) {
                return true;
            }

            $detail = (string) ($result['message'] ?? 'process_update_rejected');
            $this->notifyFailure($chatId, $telegramUserId, 'پردازش روی سرور اصلی', $detail);
            $this->queue->push($update);

            return false;
        } catch (\Throwable $e) {
            $this->notifyFailure($chatId, $telegramUserId, 'پردازش روی سرور اصلی', $e->getMessage());
            $this->queue->push($update);

            return false;
        }
    }

    private function notifyFailure(int $chatId, int $telegramUserId, string $operation, string $detail): void
    {
        $this->reporter->report($telegramUserId, $operation, $detail);

        if ($chatId !== 0) {
            $this->api->sendMessage($chatId, $this->offlineMessages->text());
        }
    }

    /** @param array<string, mixed> $update */
    public function enqueueOnly(array $update): void
    {
        $this->queue->push($update);
    }
}
