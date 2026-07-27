<?php

namespace App\Modules\TelegramBot\Services;

use App\Enums\AdminTelegramEventKey;
use App\Models\ReferenceChannel;
use App\Models\ReferenceChannelEntitlement;
use App\Models\User;
use App\Modules\TelegramBot\Clients\TelegramBotClientFactory;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramDestination;
use App\Modules\TelegramBot\Models\TelegramDestinationInviteLink;
use App\Modules\TelegramBot\Models\TelegramDestinationLeaveEvent;
use App\Modules\TelegramBot\Models\TelegramDestinationMembership;
use App\Services\AdminTelegramLogService;
use App\Services\TelegramHostAccountSync;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Daily audit: detect left/kicked members of destinations, report to admin,
 * and release the old Telegram account so the same phone can re-bind and rejoin.
 */
class DestinationMembershipAuditService
{
    /** @var list<string> */
    private const MEMBER_STATUSES = ['creator', 'administrator', 'member', 'restricted'];

    public function __construct(
        private readonly TelegramBotClientFactory $clients,
        private readonly AdminTelegramLogService $adminTelegram,
        private readonly TelegramHostAccountSync $hostSync,
    ) {}

    /**
     * @return array{checked: int, left: int, released: int}
     */
    public function run(): array
    {
        $checked = 0;
        $left = 0;
        $released = 0;

        $destinations = TelegramDestination::query()
            ->where('is_active', true)
            ->with('bot')
            ->get();

        foreach ($destinations as $destination) {
            $bot = $destination->bot;
            if ($bot === null || ! $bot->is_active) {
                continue;
            }

            $userIds = $this->entitledUserIds($destination);
            foreach ($userIds as $userId) {
                $account = TelegramAccount::query()
                    ->where('telegram_bot_id', $bot->id)
                    ->where('user_id', $userId)
                    ->first();

                if ($account === null || (int) $account->telegram_user_id <= 0) {
                    continue;
                }

                $checked++;
                $status = $this->fetchMemberStatus($bot, $destination, (int) $account->telegram_user_id);
                $isMember = in_array($status, self::MEMBER_STATUSES, true);

                $previous = TelegramDestinationMembership::query()
                    ->where('user_id', $userId)
                    ->where('telegram_destination_id', $destination->id)
                    ->first();

                $wasMember = $previous?->is_member === true;

                TelegramDestinationMembership::query()->updateOrCreate(
                    [
                        'user_id' => $userId,
                        'telegram_destination_id' => $destination->id,
                    ],
                    [
                        'is_member' => $isMember,
                        'checked_at' => now(),
                    ],
                );

                if ($wasMember && ! $isMember && in_array($status, ['left', 'kicked'], true)) {
                    $left++;
                    $didRelease = $this->handleLeave($destination, $account, $status);
                    if ($didRelease) {
                        $released++;
                    }
                }
            }
        }

        return compact('checked', 'left', 'released');
    }

    /**
     * @return list<int>
     */
    private function entitledUserIds(TelegramDestination $destination): array
    {
        $fromMembership = TelegramDestinationMembership::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('is_member', true)
            ->pluck('user_id')
            ->all();

        $fromGrants = \App\Modules\TelegramBot\Models\TelegramAccessGrant::query()
            ->where('telegram_destination_id', $destination->id)
            ->where(function ($q): void {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->pluck('user_id')
            ->all();

        $fromReference = [];
        $refChannelIds = ReferenceChannel::query()
            ->where('telegram_destination_id', $destination->id)
            ->pluck('id');
        if ($refChannelIds->isNotEmpty()) {
            $fromReference = ReferenceChannelEntitlement::query()
                ->whereIn('reference_channel_id', $refChannelIds)
                ->pluck('user_id')
                ->all();
        }

        $fromRequirements = [];
        $productIds = $destination->requirements()
            ->whereIn('requirement_type', ['product', 'active_course_access'])
            ->pluck('requirement_value')
            ->map(fn ($v) => (int) $v)
            ->filter()
            ->all();

        if ($productIds !== []) {
            $fromRequirements = ReferenceChannelEntitlement::query()
                ->whereHas('referenceChannel', fn ($q) => $q->whereIn('product_id', $productIds))
                ->pluck('user_id')
                ->all();

            $fromRequirements = array_merge(
                $fromRequirements,
                \App\Models\CourseAccess::query()
                    ->whereIn('product_id', $productIds)
                    ->where('status', 'active')
                    ->pluck('user_id')
                    ->all(),
            );
        }

        return array_values(array_unique(array_map('intval', array_merge(
            $fromMembership,
            $fromGrants,
            $fromReference,
            $fromRequirements,
        ))));
    }

    private function fetchMemberStatus($bot, TelegramDestination $destination, int $telegramUserId): string
    {
        try {
            $member = $this->clients->forBot($bot)->getChatMember($destination->chat_id, $telegramUserId);

            return (string) ($member['status'] ?? 'left');
        } catch (Throwable $e) {
            Log::channel('telegram')->warning('destination membership audit getChatMember failed', [
                'destination_id' => $destination->id,
                'telegram_user_id' => $telegramUserId,
                'error' => $e->getMessage(),
            ]);

            return 'unknown';
        }
    }

    private function handleLeave(TelegramDestination $destination, TelegramAccount $account, string $status): bool
    {
        $userId = (int) $account->user_id;
        $released = $this->releaseTelegramAccount($destination, $account);

        TelegramDestinationLeaveEvent::query()->create([
            'user_id' => $userId,
            'telegram_destination_id' => $destination->id,
            'telegram_user_id' => (int) $account->telegram_user_id,
            'previous_status' => $status,
            'account_released' => $released,
            'detected_at' => now(),
        ]);

        $user = User::query()->find($userId);
        $this->adminTelegram->notify(AdminTelegramEventKey::DestinationMemberLeft, [
            'user_id' => $userId,
            'user_name' => $user?->name,
            'mobile' => $user?->mobile,
            'destination_title' => $destination->title,
            'destination_id' => $destination->id,
            'telegram_user_id' => (int) $account->telegram_user_id,
            'status' => $status,
            'account_released' => $released ? 'بله' : 'خیر',
        ]);

        return $released;
    }

    private function releaseTelegramAccount(TelegramDestination $destination, TelegramAccount $account): bool
    {
        $bot = $destination->bot;
        $userId = (int) $account->user_id;

        TelegramDestinationInviteLink::query()
            ->where('telegram_destination_id', $destination->id)
            ->where('user_id', $userId)
            ->whereNull('revoked_at')
            ->each(function (TelegramDestinationInviteLink $link) use ($bot, $destination): void {
                if ($bot && filled($link->invite_link)) {
                    try {
                        $this->clients->forBot($bot)->revokeChatInviteLink(
                            $destination->chat_id,
                            (string) $link->invite_link,
                        );
                    } catch (Throwable) {
                        // ignore revoke failures
                    }
                }
                $link->update(['revoked_at' => now()]);
            });

        // Detach Telegram identity so the same mobile can start with a new Telegram account.
        $account->forceFill([
            'user_id' => null,
            'mobile' => null,
            'mobile_verified_at' => null,
        ])->save();

        if ($userId > 0) {
            $user = User::query()->find($userId);
            if ($user) {
                $this->hostSync->queuePushMobileAccess($user);
            }
        }

        return true;
    }
}
