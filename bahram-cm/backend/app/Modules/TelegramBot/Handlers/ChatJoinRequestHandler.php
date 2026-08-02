<?php

namespace App\Modules\TelegramBot\Handlers;

use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Contracts\TelegramBotClientInterface;
use App\Modules\TelegramBot\Exceptions\TelegramApiException;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationMembership;
use App\Modules\TelegramBot\Models\TelegramJoinRequest;
use App\Modules\TelegramBot\Models\TelegramUpdate;
use App\Modules\TelegramBot\Services\DestinationAccessPolicy;
use App\Modules\TelegramBot\Services\DestinationInviteLinkService;
use App\Modules\TelegramBot\Support\TelegramSiteUrl;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class ChatJoinRequestHandler implements UpdateHandlerInterface
{
    public function __construct(
        private readonly DestinationAccessPolicy $policy,
        private readonly DestinationInviteLinkService $inviteLinks,
        private readonly TelegramBotClientFactory $clients,
    ) {}

    public function handle(TelegramUpdate $update, TelegramBot $bot): void
    {
        $chatId = (string) data_get($update->payload, 'chat_join_request.chat.id');
        $telegramUserId = (int) data_get($update->payload, 'chat_join_request.from.id');

        if ($chatId === '' || $telegramUserId <= 0) {
            return;
        }

        $destination = TelegramDestination::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('chat_id', $chatId)
            ->where('is_active', true)
            ->first();

        if ($destination === null) {
            // Not a registered destination — bot must not gate required/admin channels.
            return;
        }

        $rateKey = "telegram:join:{$chatId}:{$telegramUserId}";
        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            $this->safeDecline($this->clients->forBot($bot), $chatId, $telegramUserId);

            return;
        }
        RateLimiter::hit($rateKey, 3600);

        $account = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('telegram_user_id', $telegramUserId)
            ->first();

        $decision = $this->policy->evaluate($destination, $account?->user_id);

        $join = TelegramJoinRequest::query()->create([
            'telegram_bot_id' => $bot->id,
            'telegram_destination_id' => $destination?->id,
            'chat_id' => $chatId,
            'telegram_user_id' => $telegramUserId,
            'user_id' => $account?->user_id,
            'status' => $decision['allowed'] ? 'approved' : 'declined',
            'decision_reason' => $decision['reason'],
            'decided_at' => now(),
        ]);

        $client = $this->clients->forBot($bot);

        if ($decision['allowed']) {
            $this->safeApprove($client, $chatId, $telegramUserId);
            if ($destination && $account) {
                $this->inviteLinks->revokeAfterSuccessfulJoin($bot, $destination, $account);
                if ($account->user_id) {
                    TelegramDestinationMembership::query()->updateOrCreate(
                        [
                            'user_id' => (int) $account->user_id,
                            'telegram_destination_id' => $destination->id,
                        ],
                        [
                            'is_member' => true,
                            'checked_at' => now(),
                        ],
                    );
                }
            }
            if ($account) {
                $client->sendMessage($telegramUserId, '✅ درخواست عضویت شما تأیید شد.');
            }
        } else {
            $this->safeDecline($client, $chatId, $telegramUserId);
            if ($account) {
                $this->sendDeclineMessage($client, $telegramUserId, (string) $decision['reason']);
            }
        }

        unset($join);
    }

    private function safeApprove(TelegramBotClientInterface $client, string $chatId, int $telegramUserId): void
    {
        try {
            $client->approveChatJoinRequest($chatId, $telegramUserId);
        } catch (TelegramApiException $e) {
            if ($this->isHideRequesterMissing($e)) {
                Log::channel('telegram')->info('approveChatJoinRequest skipped: HIDE_REQUESTER_MISSING', [
                    'chat_id' => $chatId,
                    'telegram_user_id' => $telegramUserId,
                ]);

                return;
            }

            throw $e;
        }
    }

    private function safeDecline(TelegramBotClientInterface $client, string $chatId, int $telegramUserId): void
    {
        try {
            $client->declineChatJoinRequest($chatId, $telegramUserId);
        } catch (TelegramApiException $e) {
            if ($this->isHideRequesterMissing($e)) {
                // Channel has "hide requester" / privacy — Telegram cannot decline by user_id.
                Log::channel('telegram')->info('declineChatJoinRequest skipped: HIDE_REQUESTER_MISSING', [
                    'chat_id' => $chatId,
                    'telegram_user_id' => $telegramUserId,
                ]);

                return;
            }

            throw $e;
        }
    }

    private function isHideRequesterMissing(TelegramApiException $e): bool
    {
        return str_contains(strtoupper($e->getMessage()), 'HIDE_REQUESTER_MISSING');
    }

    private function sendDeclineMessage($client, int $telegramUserId, string $reason): void
    {
        $text = "❌ درخواست عضویت رد شد\n\n".trim($reason);
        $options = [];

        if (DestinationAccessPolicy::isIdentityRequiredReason($reason)) {
            $identityUrl = TelegramSiteUrl::identityPage();
            if (filled($identityUrl)) {
                $options = TelegramSiteUrl::linkMarkup(
                    $identityUrl,
                    'احراز هویت سطح ۲',
                    [],
                    'primary',
                    'lock',
                );
            }
        }

        $client->sendMessage($telegramUserId, $text, $options);
    }
}
