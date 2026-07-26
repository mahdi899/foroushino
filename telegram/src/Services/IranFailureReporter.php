<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/** Notifies the support reports group when the main (Iran) server is unreachable. */
final class IranFailureReporter
{
    /** @param array<string, mixed> $hostConfig */
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly array $hostConfig,
    ) {}

    public function report(int $telegramUserId, string $operation, ?string $technicalDetail = null): void
    {
        $reportsChat = $this->resolveReportsChatId();
        if ($reportsChat === null || $reportsChat === '') {
            return;
        }

        $label = $this->accounts->displayLabel($telegramUserId);
        $lines = [
            TelegramCustomEmoji::tag('warning').' <b>قطع ارتباط با سرور اصلی (ربات هاست)</b>',
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
