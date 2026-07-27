<?php

declare(strict_types=1);

namespace TelegramHost\Services;

use TelegramHost\Account\AccountCache;
use TelegramHost\Cache\SyncCache;
use TelegramHost\Queue\PendingMembershipSync;
use TelegramHost\Support\InlineButtons;
use TelegramHost\Support\TelegramCustomEmoji;
use TelegramHost\Telegram\BotApiClient;

/**
 * «حساب من» destinations: live getChatMember / invite on the foreign host,
 * glass join buttons titled with the group name (no raw URLs in text).
 */
final class HostDestinationsFlow
{
    /** @var list<string> */
    private const MEMBER_STATUSES = ['creator', 'administrator', 'member', 'restricted'];

    public function __construct(
        private readonly BotApiClient $api,
        private readonly SyncCache $cache,
        private readonly AccountCache $accounts,
        private readonly PendingMembershipSync $membershipQueue,
        private readonly string $siteBaseUrl,
    ) {}

    /**
     * @return bool true when a profile snapshot existed and a message was sent
     */
    public function sendAccount(int $chatId, int $telegramUserId): bool
    {
        $profile = $this->accounts->profileResponse($telegramUserId);
        if ($profile === null || empty($profile['ok'])) {
            return false;
        }

        // Never trust membership lines baked into an old Iran snapshot —
        // live getChatMember below is the source of truth (works while Iran is down).
        $baseText = $this->stripStaleDestinationSection(trim((string) ($profile['text'] ?? '')));
        if ($baseText === '') {
            return false;
        }

        $accessible = $this->accessibleDestinations($telegramUserId, $profile);
        $syncItems = [];
        $joinButtons = [];
        $destLines = [];

        if ($accessible !== []) {
            $destLines[] = TelegramCustomEmoji::tag('pin').' <b>گروه‌های پشتیبانی شما</b>';
            $destLines[] = '──────────────';

            foreach ($accessible as $destination) {
                $isMember = $this->isChatMember((string) $destination['chat_id'], $telegramUserId);
                $syncItems[] = [
                    'destination_id' => (int) $destination['id'],
                    'is_member' => $isMember,
                    'checked_at' => gmdate('c'),
                ];

                $destLines[] = '• <b>'.$this->escape((string) $destination['title']).'</b>';
                $titles = (array) ($destination['product_titles'] ?? []);
                if ($titles !== []) {
                    $destLines[] = '  دوره: '.$this->escape(implode('، ', array_map('strval', $titles)));
                }

                if ($isMember) {
                    $destLines[] = '  '.TelegramCustomEmoji::tag('check').' شما عضو این گروه هستید.';

                    continue;
                }

                $destLines[] = '  '.TelegramCustomEmoji::tag('lock').' برای عضویت از دکمه زیر استفاده کنید.';
                $inviteUrl = $this->resolveInviteUrl($destination, $telegramUserId);
                if ($inviteUrl !== null && $inviteUrl !== '') {
                    $joinButtons[] = [InlineButtons::url(
                        (string) $destination['title'],
                        $inviteUrl,
                        'pin',
                    )];
                }
            }
        } else {
            // destinations_cache empty (bootstrap not refreshed) but old snapshot
            // still has invite URL buttons — offer rejoin without claiming membership.
            $recovered = $this->recoverDestinationsFromProfile($profile);
            if ($recovered !== []) {
                $destLines[] = TelegramCustomEmoji::tag('pin').' <b>گروه‌های پشتیبانی شما</b>';
                $destLines[] = '──────────────';
                foreach ($recovered as $item) {
                    $destLines[] = '• <b>'.$this->escape((string) $item['title']).'</b>';
                    $destLines[] = '  '.TelegramCustomEmoji::tag('lock').' برای عضویت از دکمه زیر استفاده کنید.';
                    $joinButtons[] = [InlineButtons::url(
                        (string) $item['title'],
                        (string) $item['url'],
                        'pin',
                    )];
                }
            }
        }

        $text = $baseText;
        if ($destLines !== []) {
            $text .= "\n\n".implode("\n", $destLines);
        }

        $keyboard = $joinButtons;
        $verificationLevel = (int) ($profile['verification_level'] ?? 0);
        if ($verificationLevel < 2) {
            $identityUrl = $this->cache->siteUrl(
                'identity',
                $this->siteBaseUrl.'/panel/identity-verification',
            );
            if ($identityUrl !== '') {
                $keyboard[] = [InlineButtons::url('احراز هویت سطح ۲', $identityUrl, 'lock', 'primary')];
            }
        }

        $panelUrl = $this->siteBaseUrl.'/panel';
        $keyboard[] = [InlineButtons::url('ورود به پنل دانشجو', $panelUrl, 'graduation', 'success')];

        $this->api->sendMessage($chatId, $text, [
            'parse_mode' => 'HTML',
            'reply_markup' => ['inline_keyboard' => $keyboard],
        ]);

        if ($syncItems !== []) {
            $this->membershipQueue->push([
                'telegram_user_id' => $telegramUserId,
                'items' => $syncItems,
            ]);
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return list<array<string, mixed>>
     */
    private function accessibleDestinations(int $telegramUserId, array $profile = []): array
    {
        $seminarProductIds = [];
        foreach ($this->cache->seminars() as $seminar) {
            $pid = (int) ($seminar['product_id'] ?? 0);
            if ($pid > 0) {
                $seminarProductIds[$pid] = true;
            }
        }

        $hasSat = $this->hasSatAccess($telegramUserId);
        $catalog = $this->cache->destinations();
        if ($catalog === []) {
            // Snapshot fallback while destinations_cache is empty (Iran down / bootstrap stale).
            foreach ((array) ($profile['destinations'] ?? []) as $row) {
                if (is_array($row) && (int) ($row['id'] ?? 0) > 0) {
                    $catalog[] = $row;
                }
            }
        }

        $matched = [];
        foreach ($catalog as $destination) {
            if (! $this->userCanAccess($telegramUserId, $destination, $hasSat)) {
                continue;
            }
            $matched[] = $destination;
        }

        usort($matched, function (array $a, array $b) use ($seminarProductIds): int {
            $aSeminar = $this->touchesSeminar($a, $seminarProductIds);
            $bSeminar = $this->touchesSeminar($b, $seminarProductIds);
            if ($aSeminar !== $bSeminar) {
                return $aSeminar ? -1 : 1;
            }

            return ((int) ($a['id'] ?? 0)) <=> ((int) ($b['id'] ?? 0));
        });

        return $matched;
    }

    /** @param array<string, mixed> $destination */
    private function userCanAccess(int $telegramUserId, array $destination, bool $hasSat): bool
    {
        $productIds = array_values(array_map('intval', (array) ($destination['product_ids'] ?? [])));
        $needsSat = ! empty($destination['sat_membership']);

        if ($productIds === [] && ! $needsSat) {
            return false;
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

        $satOk = ! $needsSat || $hasSat;

        return $productOk && $satOk;
    }

    private function hasSatAccess(int $telegramUserId): bool
    {
        $sat = $this->accounts->satSnapshot($telegramUserId);

        return is_array($sat) && ! empty($sat['access_opened']);
    }

    /**
     * @param  array<string, mixed>  $destination
     * @param  array<int, true>  $seminarProductIds
     */
    private function touchesSeminar(array $destination, array $seminarProductIds): bool
    {
        foreach ((array) ($destination['product_ids'] ?? []) as $productId) {
            if (isset($seminarProductIds[(int) $productId])) {
                return true;
            }
        }

        return false;
    }

    private function isChatMember(string $chatId, int $telegramUserId): bool
    {
        if ($chatId === '' || $telegramUserId <= 0) {
            return false;
        }

        try {
            $member = $this->api->getChatMember($chatId, $telegramUserId);
            $status = strtolower(trim((string) ($member['status'] ?? '')));
            if ($status === '' || in_array($status, ['left', 'kicked'], true)) {
                return false;
            }

            return in_array($status, self::MEMBER_STATUSES, true);
        } catch (\Throwable) {
            // Bot can't see the user / API error → treat as not a member so re-join is offered.
            return false;
        }
    }

    /** @param array<string, mixed> $destination */
    private function resolveInviteUrl(array $destination, int $telegramUserId): ?string
    {
        $mode = (string) ($destination['invite_mode'] ?? 'shared');
        if ($mode !== 'per_user') {
            $shared = trim((string) ($destination['shared_invite_url'] ?? ''));

            return $shared !== '' ? $shared : null;
        }

        $chatId = (string) ($destination['chat_id'] ?? '');
        if ($chatId === '') {
            return null;
        }

        $name = 'dest-'.(int) ($destination['id'] ?? 0).'-tg-'.$telegramUserId.'-'.substr((string) time(), -5);
        $attempts = [
            ['name' => $name, 'creates_join_request' => true],
            ['name' => $name.'-m', 'member_limit' => 1],
        ];

        foreach ($attempts as $options) {
            try {
                $created = $this->api->createChatInviteLink($chatId, $options);
                $url = trim((string) ($created['invite_link'] ?? ''));
                if ($url !== '') {
                    return $url;
                }
            } catch (\Throwable $e) {
                error_log('[telegram-host] createChatInviteLink: '.$e->getMessage());
            }
        }

        $shared = trim((string) ($destination['shared_invite_url'] ?? ''));

        return $shared !== '' ? $shared : null;
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return list<array{title: string, url: string}>
     */
    private function recoverDestinationsFromProfile(array $profile): array
    {
        $options = (array) ($profile['options'] ?? []);
        $markup = (array) ($options['reply_markup'] ?? []);
        $rows = (array) ($markup['inline_keyboard'] ?? []);
        $skipTitles = [
            'احراز هویت سطح ۲',
            'ورود به پنل دانشجو',
            'باشگاه مشتریان در پنل',
        ];

        $out = [];
        $seen = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            foreach ($row as $button) {
                if (! is_array($button)) {
                    continue;
                }
                $url = trim((string) ($button['url'] ?? ''));
                $title = trim((string) ($button['text'] ?? ''));
                if ($url === '' || $title === '' || isset($seen[$title])) {
                    continue;
                }
                if (in_array($title, $skipTitles, true)) {
                    continue;
                }
                // Invite / t.me links only — not site panel URLs.
                if (! str_contains($url, 't.me/') && ! str_contains($url, 'telegram.me/')) {
                    continue;
                }
                $seen[$title] = true;
                $out[] = ['title' => $title, 'url' => $url];
            }
        }

        return $out;
    }

    /**
     * Old Iran account snapshots appended destination membership into profile text.
     * Those lines go stale the moment the user leaves a group — strip them always.
     */
    private function stripStaleDestinationSection(string $text): string
    {
        if ($text === '') {
            return '';
        }

        $markers = [
            'گروه‌های پشتیبانی شما',
            'گروه پشتیبانی سات',
            'شما عضو این گروه هستید',
            'برای عضویت از دکمه زیر',
            'برای عضویت از لینک',
        ];

        $cutAt = null;
        foreach ($markers as $marker) {
            $pos = mb_strpos($text, $marker);
            if ($pos === false) {
                continue;
            }
            $before = mb_substr($text, 0, $pos);
            $nl = mb_strrpos($before, "\n\n");
            $candidate = $nl !== false ? $nl : $pos;
            $cutAt = $cutAt === null ? $candidate : min($cutAt, $candidate);
        }

        if ($cutAt !== null) {
            $text = trim(mb_substr($text, 0, $cutAt));
        }

        // Drop leftover bullet destination lines if a header was partially missing.
        $lines = preg_split("/\r\n|\n|\r/", $text) ?: [];
        $kept = [];
        foreach ($lines as $line) {
            $plain = trim(html_entity_decode(strip_tags($line), ENT_QUOTES | ENT_HTML5, 'UTF-8'));
            if ($plain === '') {
                $kept[] = $line;
                continue;
            }
            if (str_contains($plain, 'عضو این گروه هستید')
                || str_contains($plain, 'برای عضویت از دکمه')
                || str_contains($plain, 'برای عضویت از لینک')
                || str_contains($plain, 'گروه‌های پشتیبانی')
                || str_contains($plain, 'گروه پشتیبانی سات')
            ) {
                continue;
            }
            $kept[] = $line;
        }

        return trim(implode("\n", $kept));
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
