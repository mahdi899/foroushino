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
 * «حساب من» destinations on the foreign host.
 *
 * Membership is decided by this host bot calling Telegram getChatMember
 * (api.telegram.org) with the bot token — never Iran. Short-lived local
 * MembershipCheckCache avoids repeating slow API calls on every «حساب من» tap.
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
        private readonly ?MembershipCheckCache $membershipCache = null,
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

        // Strip membership lines from old Iran snapshots — they go stale after leave.
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
                $title = (string) ($destination['title'] ?? '');
                $destChatId = $this->normalizeChatId($destination['chat_id'] ?? null);

                // Live check on THIS host → api.telegram.org (Iran offline is fine).
                $isMember = $destChatId !== ''
                    ? $this->liveIsGroupMember($destChatId, $telegramUserId)
                    : false;

                if ((int) ($destination['id'] ?? 0) > 0) {
                    $syncItems[] = [
                        'destination_id' => (int) $destination['id'],
                        'is_member' => $isMember,
                        'checked_at' => gmdate('c'),
                    ];
                }

                $destLines[] = '• <b>'.$this->escape($title).'</b>';
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
                    $joinButtons[] = [InlineButtons::url($title !== '' ? $title : 'عضویت', $inviteUrl, 'pin')];
                }
            }
        } else {
            // No chat_id catalog yet — recover invite buttons, still never claim "member".
            $recovered = $this->recoverDestinationsFromProfile($profile);
            if ($recovered !== []) {
                $destLines[] = TelegramCustomEmoji::tag('pin').' <b>گروه‌های پشتیبانی شما</b>';
                $destLines[] = '──────────────';
                foreach ($recovered as $item) {
                    $matched = $this->findDestinationByTitle((string) $item['title'], $profile);
                    $destChatId = $matched !== null
                        ? $this->normalizeChatId($matched['chat_id'] ?? null)
                        : '';
                    $isMember = $destChatId !== ''
                        ? $this->liveIsGroupMember($destChatId, $telegramUserId)
                        : false;

                    $destLines[] = '• <b>'.$this->escape((string) $item['title']).'</b>';
                    if ($isMember) {
                        $destLines[] = '  '.TelegramCustomEmoji::tag('check').' شما عضو این گروه هستید.';

                        continue;
                    }
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
        $needsIdentity = ! empty($profile['needs_identity_for_reference'])
            && $verificationLevel < 2
            && ! $this->accounts->hasIdentityLevel2($telegramUserId);
        if ($needsIdentity) {
            $identityUrl = $this->cache->siteUrl(
                'identity',
                $this->siteBaseUrl.'/panel/identity-verification',
            );
            if ($identityUrl !== '') {
                $keyboard[] = [InlineButtons::url('احراز هویت سطح ۲', $identityUrl, 'lock', 'primary')];
            }
        }

        $keyboard[] = [InlineButtons::url('ورود به پنل دانشجو', $this->siteBaseUrl.'/panel', 'graduation', 'success')];

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
     * Host bot → Telegram getChatMember. Source of truth for group membership.
     */
    private function liveIsGroupMember(string $chatId, int $telegramUserId): bool
    {
        if ($chatId === '' || $telegramUserId <= 0) {
            return false;
        }

        $cached = $this->membershipCache?->get($telegramUserId, $chatId);
        if ($cached !== null) {
            return $cached;
        }

        try {
            $member = $this->api->getChatMember($chatId, $telegramUserId);
            $status = strtolower(trim((string) ($member['status'] ?? '')));

            // Explicit non-member statuses (user left / was removed).
            if ($status === '' || in_array($status, ['left', 'kicked'], true)) {
                error_log(sprintf(
                    '[telegram-host] getChatMember chat=%s user=%d status=%s → not member',
                    $chatId,
                    $telegramUserId,
                    $status === '' ? '(empty)' : $status,
                ));
                $this->membershipCache?->remember($telegramUserId, $chatId, false);

                return false;
            }

            $isMember = in_array($status, self::MEMBER_STATUSES, true);
            error_log(sprintf(
                '[telegram-host] getChatMember chat=%s user=%d status=%s → %s',
                $chatId,
                $telegramUserId,
                $status,
                $isMember ? 'member' : 'not member',
            ));
            $this->membershipCache?->remember($telegramUserId, $chatId, $isMember);

            return $isMember;
        } catch (\Throwable $e) {
            // e.g. user not found in chat after leave, or bot lacks rights.
            error_log(sprintf(
                '[telegram-host] getChatMember chat=%s user=%d error=%s → not member',
                $chatId,
                $telegramUserId,
                $e->getMessage(),
            ));
            $this->membershipCache?->remember($telegramUserId, $chatId, false);

            return false;
        }
    }

    private function normalizeChatId(mixed $chatId): string
    {
        if ($chatId === null || $chatId === '') {
            return '';
        }
        // Keep as string — never cast large Telegram ids through int/float.
        if (is_int($chatId) || is_float($chatId)) {
            return sprintf('%.0f', $chatId);
        }

        return trim((string) $chatId);
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

        // Prefer local destinations_cache; fall back to profile meta (chat_id included).
        $byId = [];
        foreach ($this->cache->destinations() as $destination) {
            $id = (int) ($destination['id'] ?? 0);
            if ($id > 0) {
                $destination['chat_id'] = $this->normalizeChatId($destination['chat_id'] ?? null);
                $byId[$id] = $destination;
            }
        }
        foreach ((array) ($profile['destinations'] ?? []) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $id = (int) ($row['id'] ?? 0);
            if ($id <= 0 || isset($byId[$id])) {
                continue;
            }
            $row['chat_id'] = $this->normalizeChatId($row['chat_id'] ?? null);
            $byId[$id] = $row;
        }

        $matched = [];
        foreach ($byId as $destination) {
            // Profile-listed destinations were already access-checked on Iran when pushed.
            $fromProfileOnly = ! $this->destinationInCache((int) ($destination['id'] ?? 0))
                && $this->profileListsDestination($profile, (int) ($destination['id'] ?? 0));

            if (! $fromProfileOnly && ! $this->userCanAccess($telegramUserId, $destination, $hasSat)) {
                continue;
            }
            if ($this->normalizeChatId($destination['chat_id'] ?? null) === '') {
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

    private function destinationInCache(int $id): bool
    {
        if ($id <= 0) {
            return false;
        }
        foreach ($this->cache->destinations() as $destination) {
            if ((int) ($destination['id'] ?? 0) === $id) {
                return true;
            }
        }

        return false;
    }

    /** @param array<string, mixed> $profile */
    private function profileListsDestination(array $profile, int $id): bool
    {
        foreach ((array) ($profile['destinations'] ?? []) as $row) {
            if (is_array($row) && (int) ($row['id'] ?? 0) === $id) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $profile
     * @return array<string, mixed>|null
     */
    private function findDestinationByTitle(string $title, array $profile): ?array
    {
        $title = trim($title);
        if ($title === '') {
            return null;
        }

        foreach (array_merge($this->cache->destinations(), (array) ($profile['destinations'] ?? [])) as $destination) {
            if (! is_array($destination)) {
                continue;
            }
            if (trim((string) ($destination['title'] ?? '')) === $title) {
                $destination['chat_id'] = $this->normalizeChatId($destination['chat_id'] ?? null);

                return $destination;
            }
        }

        return null;
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

        return $productOk && (! $needsSat || $hasSat);
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

    /** @param array<string, mixed> $destination */
    private function resolveInviteUrl(array $destination, int $telegramUserId): ?string
    {
        $mode = (string) ($destination['invite_mode'] ?? 'shared');
        if ($mode !== 'per_user') {
            $shared = trim((string) ($destination['shared_invite_url'] ?? ''));

            return $shared !== '' ? $shared : null;
        }

        $chatId = $this->normalizeChatId($destination['chat_id'] ?? null);
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
            'ورود به باشگاه',
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
                if (! str_contains($url, 't.me/') && ! str_contains($url, 'telegram.me/')) {
                    continue;
                }
                $seen[$title] = true;
                $out[] = ['title' => $title, 'url' => $url];
            }
        }

        return $out;
    }

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
