<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\IranSyncFailureException;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * Notifies the support reports group when the main (Iran) server is unreachable.
 *
 * Does NOT own a circuit breaker anymore — the notification decision
 * (`shouldNotify`/`wasAlreadyDown`) is made once, by {@see \TelegramHost\Http\SyncClient},
 * and carried on {@see IranSyncFailureException}. A second breaker instance
 * here used to double-record every failure (and every circuit-open skip),
 * which kept the circuit open indefinitely under normal traffic.
 */
final class IranFailureReporter
{
    /** @param array<string, mixed> $hostConfig */
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly array $hostConfig,
    ) {}

    /**
     * Report a failure coming from a real Iran sync/live call.
     */
    public function reportFailure(int $telegramUserId, string $operation, IranSyncFailureException $exception): void
    {
        if (! $exception->shouldNotify) {
            return;
        }

        $this->send($telegramUserId, $operation, $exception->wasAlreadyDown, $exception->getMessage());
    }

    /**
     * Defensive fallback for exceptions that did not go through SyncClient
     * (should not normally happen since every Iran call is routed through
     * it) — log only, never mutate the circuit or spam the reports group
     * for something we can't classify as a real outage.
     */
    public function reportUnexpected(int $telegramUserId, string $operation, string $technicalDetail): void
    {
        error_log("[telegram-host] unexpected failure ({$operation}) for user {$telegramUserId}: {$technicalDetail}");
    }

    private function send(int $telegramUserId, string $operation, bool $wasAlreadyDown, ?string $technicalDetail): void
    {
        $reportsChat = $this->resolveReportsChatId();
        if ($reportsChat === null || $reportsChat === '') {
            return;
        }

        $label = $this->accounts->displayLabel($telegramUserId);
        $title = $wasAlreadyDown
            ? 'قطع ارتباط با سرور اصلی (ربات هاست) — همچنان ادامه دارد'
            : 'قطع ارتباط با سرور اصلی (ربات هاست)';
        $lines = [
            TelegramCustomEmoji::tag('warning').' <b>'.$title.'</b>',
            '',
            'کاربر: '.htmlspecialchars($label, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
            'شناسه تلگرام: <code>'.$telegramUserId.'</code>',
            'عملیات: '.htmlspecialchars($operation, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'),
        ];

        if ($technicalDetail !== null && $technicalDetail !== '') {
            $lines[] = 'جزئیات: <code>'.htmlspecialchars(mb_substr($technicalDetail, 0, 400), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8').'</code>';
        }

        $lines[] = '';
        $lines[] = 'زمان: '.date('Y-m-d H:i:s');

        try {
            $this->api->sendMessage($reportsChat, implode("\n", $lines));
        } catch (\Throwable $e) {
            error_log('[telegram-host] iran failure report: '.$e->getMessage());
        }
    }

    private function resolveReportsChatId(): ?string
    {
        $fromConfig = trim((string) ($this->hostConfig['reports_group_chat_id'] ?? ''));
        if ($fromConfig !== '') {
            return $fromConfig;
        }

        return $this->cache->reportsGroupChatId();
    }
}
