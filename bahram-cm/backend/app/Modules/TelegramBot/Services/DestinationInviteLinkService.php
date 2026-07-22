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
    public function __construct(
        private readonly DestinationAccessPolicy $policy,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function resolveInviteUrl(
        TelegramBot $bot,
        TelegramDestination $destination,
        TelegramAccount $account,
    ): ?string {
        if (! $account->user_id) {
            return null;
        }

        $decision = $this->policy->evaluate($destination, (int) $account->user_id);
        if (! $decision['allowed']) {
            return null;
        }

        if ($destination->usesPerUserInvites()) {
            return $this->resolvePerUserInviteUrl($bot, $destination, $account);
        }

        return $this->sharedInviteUrl($destination);
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

        if ($existing !== null && filled($existing->invite_link) && ! $existing->isExpired()) {
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

            return $this->sharedInviteUrl($destination);
        }

        $inviteLink = (string) ($created['invite_link'] ?? '');
        if ($inviteLink === '') {
            return $this->sharedInviteUrl($destination);
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
            ],
        );

        return $inviteLink;
    }

    private function sharedInviteUrl(TelegramDestination $destination): ?string
    {
        if (filled($destination->join_request_url)) {
            return (string) $destination->join_request_url;
        }

        if (filled($destination->username)) {
            return 'https://t.me/'.ltrim((string) $destination->username, '@');
        }

        return null;
    }
}
