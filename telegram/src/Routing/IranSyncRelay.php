<?php

declare(strict_types=1);

namespace TelegramHost\Routing;

use TelegramHost\Http\LiveClient;
use TelegramHost\Queue\IranUpdateQueue;
use TelegramHost\Services\IranFailureReporter;
use TelegramHost\Support\IranSyncFailureException;
use TelegramHost\Telegram\BotApiClient;

/** Tries Iran process-update; failures are queued silently (no user-facing outage text). */
final class IranSyncRelay
{
    public function __construct(
        private readonly LiveClient $live,
        private readonly BotApiClient $api,
        private readonly IranUpdateQueue $queue,
        private readonly IranFailureReporter $reporter,
    ) {}

    /**
     * @param array<string, mixed> $update
     */
    public function tryRelay(int $chatId, int $telegramUserId, array $update): bool
    {
        if ($chatId !== 0) {
            $this->api->sendChatAction($chatId, 'typing');
        }

        try {
            // Single attempt, short-enough for UX: no 8s+8s retry storm.
            $result = $this->live->processUpdate($update, 5, false);
            if (($result['ok'] ?? false) === true) {
                return true;
            }

            // Iran answered but rejected the update — not a connectivity failure.
            error_log('[telegram-host] relay rejected: '.(string) ($result['message'] ?? 'relay_rejected'));
            $this->queue->push($update);

            return false;
        } catch (IranSyncFailureException $e) {
            $this->reporter->reportFailure($telegramUserId, 'پردازش روی سرور اصلی', $e);
            $this->queue->push($update);

            return false;
        } catch (\Throwable $e) {
            $this->reporter->reportUnexpected($telegramUserId, 'پردازش روی سرور اصلی', $e->getMessage());
            $this->queue->push($update);

            return false;
        }
    }

    /** @param array<string, mixed> $update */
    public function enqueue(array $update): void
    {
        $this->queue->push($update);
    }
}
