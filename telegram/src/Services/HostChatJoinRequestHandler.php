<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Telegram\BotApiClient;

/**
 * Approve/decline channel join requests on the foreign host (no Iran hop).
 *
 * These updates are NOT "bot users" — anyone who taps a join-request invite
 * for a channel where the bot is admin generates chat_join_request traffic.
 */
final class HostChatJoinRequestHandler
{
    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly string $siteBaseUrl,
    ) {}

    /** @param array<string, mixed> $joinRequest */
    public function handle(array $joinRequest): void
    {
        $chatId = $this->normalizeChatId($joinRequest['chat']['id'] ?? null);
        $telegramUserId = (int) ($joinRequest['from']['id'] ?? 0);

        if ($chatId === '' || $telegramUserId <= 0) {
            return;
        }

        $destination = $this->findDestination($chatId);
        if ($destination === null) {
            // Not a registered destination (campaign / SAT / reference group) — ignore.
            // Required chats, reports group, and other admin channels are out of scope.
            return;
        }

        $allowed = $this->userMayJoin($telegramUserId, $destination);
        if ($allowed['ok']) {
            $this->safeApprove($chatId, $telegramUserId);
            if ($this->accounts->isVerified($telegramUserId)) {
                try {
                    $this->api->sendMessage($telegramUserId, '✅ درخواست عضویت شما تأیید شد.');
                } catch (\Throwable) {
                    // User may not have started the bot — fine.
                }
            }

            return;
        }

        $this->safeDecline($chatId, $telegramUserId);
        if ($this->accounts->isVerified($telegramUserId)) {
            $this->notifyDeclined($telegramUserId, $allowed['reason'], $allowed['needs_identity']);
        }
    }

    /**
     * @param  array<string, mixed>  $destination
     * @return array{ok: bool, reason: string, needs_identity: bool}
     */
    private function userMayJoin(int $telegramUserId, array $destination): array
    {
        if (! $this->accounts->isVerified($telegramUserId)) {
            return [
                'ok' => false,
                'reason' => 'ابتدا در ربات /start بزنید و ثبت‌نام را کامل کنید.',
                'needs_identity' => false,
            ];
        }

        $mergeMeta = $this->accounts->destinationMergeMeta($telegramUserId);
        if (($mergeMeta['role'] ?? '') === 'blocked') {
            return [
                'ok' => false,
                'reason' => $this->destinationMergeBlockedMessage((string) ($mergeMeta['partner_mobile'] ?? '')),
                'needs_identity' => false,
            ];
        }

        $needsIdentity = ! empty($destination['requires_identity_level_2']);
        if ($needsIdentity && ! $this->accounts->hasIdentityLevel2($telegramUserId)) {
            return [
                'ok' => false,
                'reason' => 'احراز هویت سطح ۲ لازم است تا عضو این گروه شوید.',
                'needs_identity' => true,
            ];
        }

        $productIds = array_values(array_map('intval', (array) ($destination['product_ids'] ?? [])));
        $needsSat = ! empty($destination['sat_membership']);
        $hasSat = false;
        if ($needsSat) {
            $sat = $this->accounts->satSnapshot($telegramUserId);
            $hasSat = is_array($sat) && ! empty($sat['access_opened']);
        }

        if ($productIds === [] && ! $needsSat) {
            return [
                'ok' => false,
                'reason' => 'شرایط دسترسی برای این مقصد تعریف نشده است.',
                'needs_identity' => false,
            ];
        }

        $productOk = $productIds === [];
        if (! $productOk) {
            foreach ($productIds as $productId) {
                if ($productId > 0 && $this->accounts->ownsProduct($telegramUserId, $productId)) {
                    $productOk = true;
                    break;
                }
            }
        }

        if (! $productOk) {
            return [
                'ok' => false,
                'reason' => 'برای عضویت باید دوره/سمینار مرتبط را خریده باشید.',
                'needs_identity' => false,
            ];
        }

        if ($needsSat && ! $hasSat) {
            return [
                'ok' => false,
                'reason' => 'دسترسی سات شما هنوز باز نشده است.',
                'needs_identity' => false,
            ];
        }

        return ['ok' => true, 'reason' => 'ok', 'needs_identity' => false];
    }

    private function destinationMergeBlockedMessage(string $partnerMobile): string
    {
        $masked = $this->maskMobile($partnerMobile);
        $template = $this->cache->message(
            'destination_merge_blocked',
            'خط شما با شماره {mobile} ادغام شده است. برای کانال‌های پشتیبانی از همان شماره استفاده کنید. در صورت مشکل با پشتیبانی تماس بگیرید.',
        );

        return str_replace('{mobile}', $masked, $template);
    }

    private function maskMobile(string $mobile): string
    {
        $mobile = trim($mobile);
        if (strlen($mobile) < 6) {
            return $mobile;
        }

        return substr($mobile, 0, 4).'…'.substr($mobile, -3);
    }

    /** @return array<string, mixed>|null */
    private function findDestination(string $chatId): ?array
    {
        foreach ($this->cache->destinations() as $destination) {
            if (! is_array($destination)) {
                continue;
            }
            if ($this->normalizeChatId($destination['chat_id'] ?? null) === $chatId) {
                return $destination;
            }
        }

        return null;
    }

    private function notifyDeclined(int $telegramUserId, string $reason, bool $needsIdentity): void
    {
        $options = [];
        if ($needsIdentity) {
            $identityUrl = rtrim($this->siteBaseUrl, '/').'/identity';
            $options = [
                'reply_markup' => [
                    'inline_keyboard' => [[
                        InlineButtons::url('احراز هویت سطح ۲', $identityUrl, 'lock', 'primary'),
                    ]],
                ],
            ];
        }

        try {
            $this->api->sendMessage(
                $telegramUserId,
                "❌ درخواست عضویت رد شد\n\n".trim($reason),
                $options,
            );
        } catch (\Throwable) {
            // ignore
        }
    }

    private function safeApprove(string $chatId, int $telegramUserId): void
    {
        try {
            $this->api->approveChatJoinRequest($chatId, $telegramUserId);
        } catch (\Throwable $e) {
            if ($this->isHideRequesterMissing($e)) {
                return;
            }
            error_log('[telegram-host] approveChatJoinRequest: '.$e->getMessage());
        }
    }

    private function safeDecline(string $chatId, int $telegramUserId): void
    {
        try {
            $this->api->declineChatJoinRequest($chatId, $telegramUserId);
        } catch (\Throwable $e) {
            if ($this->isHideRequesterMissing($e)) {
                return;
            }
            error_log('[telegram-host] declineChatJoinRequest: '.$e->getMessage());
        }
    }

    private function isHideRequesterMissing(\Throwable $e): bool
    {
        return str_contains(strtoupper($e->getMessage()), 'HIDE_REQUESTER_MISSING');
    }

    private function normalizeChatId(mixed $raw): string
    {
        if ($raw === null || $raw === '') {
            return '';
        }

        return (string) $raw;
    }
}
