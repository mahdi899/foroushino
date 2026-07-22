<?php

namespace App\Modules\TelegramBot\Services;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationInviteLink;
use Illuminate\Support\Facades\Log;
use Throwable;

class DestinationInviteLinkService
{
    /** @var list<string> */
    private const MEMBER_STATUSES = ['creator', 'administrator', 'member', 'restricted'];

    public function __construct(
        private readonly DestinationAccessPolicy $policy,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    /**
     * @return array{
     *     status: 'member'|'invite',
     *     invite_url: ?string,
     *     mode: 'per_user'|'shared'
     * }|null
     */
    public function resolveForAccount(
        TelegramBot $bot,
        TelegramDestination $destination,
        TelegramAccount $account,
    ): ?array {
        if (! $account->user_id) {
            return null;
        }

        $decision = $this->policy->evaluate($destination, (int) $account->user_id);
        if (! $decision['allowed']) {
            return null;
        }

        if ($this->isGroupMember($bot, $destination, (int) $account->telegram_user_id)) {
            return [
                'status' => 'member',
                'invite_url' => null,
                'mode' => $destination->usesPerUserInvites() ? 'per_user' : 'shared',
            ];
        }

        $inviteUrl = $destination->usesPerUserInvites()
            ? $this->resolvePerUserInviteUrl($bot, $destination, $account)
            : $this->ensureSharedJoinRequestUrl($bot, $destination);

        if (blank($inviteUrl)) {
            return null;
        }

        return [
            'status' => 'invite',
            'invite_url' => (string) $inviteUrl,
            'mode' => $destination->usesPerUserInvites() ? 'per_user' : 'shared',
        ];
    }

    public function resolveInviteUrl(
        TelegramBot $bot,
        TelegramDestination $destination,
        TelegramAccount $account,
    ): ?string {
        $resolved = $this->resolveForAccount($bot, $destination, $account);

        return $resolved && $resolved['status'] === 'invite'
            ? $resolved['invite_url']
            : null;
    }

    public function revokeAfterSuccessfulJoin(
        TelegramBot $bot,
        TelegramDestination $destination,
        TelegramAccount $account,
    ): void {
        if (! $destination->usesPerUserInvites() || ! $account->user_id) {
            return;
        }

        $record = TelegramDestinationInviteLink::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $account->user_id)
            ->whereNull('revoked_at')
            ->first();

        if ($record === null || blank($record->invite_link)) {
            return;
        }

        try {
            $this->clients->forBot($bot)->revokeChatInviteLink(
                $destination->chat_id,
                (string) $record->invite_link,
            );
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('destination_invite_revoke_failed', [
                'destination_id' => $destination->id,
                'user_id' => $account->user_id,
                'error' => $e->getMessage(),
            ]);
        }

        $record->update([
            'revoked_at' => now(),
            'used_at' => now(),
        ]);
    }

    public function isGroupMember(TelegramBot $bot, TelegramDestination $destination, int $telegramUserId): bool
    {
        if ($telegramUserId <= 0) {
            return false;
        }

        try {
            $member = $this->clients->forBot($bot)->getChatMember($destination->chat_id, $telegramUserId);
            $status = (string) ($member['status'] ?? '');

            return in_array($status, self::MEMBER_STATUSES, true);
        } catch (Throwable) {
            return false;
        }
    }

    private function resolvePerUserInviteUrl(
        TelegramBot $bot,
        TelegramDestination $destination,
        TelegramAccount $account,
    ): ?string {
        $existing = TelegramDestinationInviteLink::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $account->user_id)
            ->first();

        if ($existing !== null && $existing->isActive()) {
            return (string) $existing->invite_link;
        }

        try {
            $created = $this->clients->forBot($bot)->createChatInviteLink($destination->chat_id, [
                'name' => 'dest-'.$destination->id.'-user-'.$account->user_id,
                'creates_join_request' => true,
                'member_limit' => 1,
            ]);
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('destination_per_user_invite_failed', [
                'destination_id' => $destination->id,
                'user_id' => $account->user_id,
                'error' => $e->getMessage(),
            ]);

            return $this->ensureSharedJoinRequestUrl($bot, $destination);
        }

        $inviteLink = (string) ($created['invite_link'] ?? '');
        if ($inviteLink === '') {
            return $this->ensureSharedJoinRequestUrl($bot, $destination);
        }

        TelegramDestinationInviteLink::query()->updateOrCreate(
            [
                'telegram_destination_id' => $destination->id,
                'user_id' => $account->user_id,
            ],
            [
                'telegram_account_id' => $account->id,
                'telegram_user_id' => $account->telegram_user_id,
                'invite_link' => $inviteLink,
                'expires_at' => null,
                'revoked_at' => null,
                'used_at' => null,
            ],
        );

        return $inviteLink;
    }

    private function ensureSharedJoinRequestUrl(TelegramBot $bot, TelegramDestination $destination): ?string
    {
        if (filled($destination->join_request_url)) {
            return (string) $destination->join_request_url;
        }

        if (filled($destination->username)) {
            return 'https://t.me/'.ltrim((string) $destination->username, '@');
        }

        try {
            $created = $this->clients->forBot($bot)->createChatInviteLink($destination->chat_id, [
                'name' => 'dest-'.$destination->id.'-shared',
                'creates_join_request' => true,
            ]);
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('destination_shared_invite_failed', [
                'destination_id' => $destination->id,
                'error' => $e->getMessage(),
            ]);

            return null;
        }

        $inviteLink = (string) ($created['invite_link'] ?? '');
        if ($inviteLink === '') {
            return null;
        }

        $destination->update(['join_request_url' => $inviteLink]);

        return $inviteLink;
    }
}
