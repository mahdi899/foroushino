<?php

namespace App\Services;

use App\Jobs\PushTelegramHostSyncJob;
use App\Models\Order;
use App\Models\User;
use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Modules\TelegramBot\Models\TelegramBot;
use App\Support\StudentDisplayName;

/** Queues account + snapshot push to the external Telegram host. */
class TelegramHostAccountSync
{
    /** Catch purchases whose immediate push failed; reconcile window for scheduled heal. */
    private const RECENT_PAID_WINDOW_MINUTES = 60;

    /** Iran rows touched recently — event-driven push should have covered these. */
    private const RECENT_ACCOUNT_TOUCH_MINUTES = 30;

    public function __construct(
        private readonly TelegramHostAccountSnapshotService $snapshots,
        private readonly TelegramHostOwnershipResolver $ownership,
    ) {}

    /**
     * Model-observer entry point. Always hands the push to the queue: a blocking
     * Iran→host HTTP call here would run inside the caller's request (and often
     * its DB transaction), which is what stalls the site under load.
     */
    public function queuePush(TelegramAccount $account): void
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production') {
            return;
        }

        $payload = $this->snapshots->accountPayload($account->fresh(['user', 'bot']));
        PushTelegramHostSyncJob::account($payload);
    }

    /** Immediate push for one account (purchase, KYC) — does not wait for the 5-minute batch. */
    public function pushAccountImmediate(TelegramAccount $account, bool $replaceOwnedProductIds = false): bool
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production') {
            return false;
        }

        $payload = $this->snapshots->accountPayload($account->fresh(['user', 'bot']), $replaceOwnedProductIds);
        $push = app(TelegramHostPushService::class);
        $ok = $push->pushAccount($payload);
        if (! $ok) {
            PushTelegramHostSyncJob::accountNow($payload);
        }

        return $ok;
    }

    /** Push every production-bot Telegram row for a site user (after order / KYC). */
    public function pushUserAccountsImmediate(User $user, bool $replaceOwnedProductIds = false): int
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return 0;
        }

        $pushed = 0;
        TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('user_id', $user->id)
            ->whereNotNull('mobile_verified_at')
            ->each(function (TelegramAccount $account) use (&$pushed, $replaceOwnedProductIds): void {
                if ($this->pushAccountImmediate($account, $replaceOwnedProductIds)) {
                    $pushed++;
                }
            });

        return $pushed;
    }

    /**
     * After admin deletion/reset — push authoritative ownership snapshot and revoke
     * any mobile-only pre-provision rows on the foreign host.
     *
     * @param  list<int>  $telegramUserIds
     */
    public function syncAccessAfterDeletion(
        ?User $user,
        ?string $mobile = null,
        array $telegramUserIds = [],
        string $reason = 'admin_delete',
    ): void {
        if ($user !== null) {
            $this->pushUserAccountsImmediate($user->fresh(['profile', 'identityProfile']), true);
        }

        if ($telegramUserIds !== []) {
            $bot = TelegramBot::query()->where('key', 'production')->first();
            if ($bot !== null) {
                TelegramAccount::query()
                    ->where('telegram_bot_id', $bot->id)
                    ->whereIn('telegram_user_id', $telegramUserIds)
                    ->each(function (TelegramAccount $account): void {
                        $this->pushAccountImmediate($account->fresh(['user', 'bot']), true);
                    });
            }
        }

        $normalizedMobile = trim((string) $mobile);
        if ($normalizedMobile !== '') {
            app(TelegramHostPushService::class)->revokeMobileAccess($normalizedMobile);
        }
    }

    /** Keep telegram_accounts.display_name + host cache aligned with student panel / KYC. */
    public function syncDisplayNamesForUser(User $user): void
    {
        $user->loadMissing(['profile', 'identityProfile']);
        $resolved = StudentDisplayName::fromUser($user);
        if ($resolved === '' || $resolved === 'دانشجو') {
            return;
        }

        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return;
        }

        TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->where('user_id', $user->id)
            ->whereNotNull('mobile_verified_at')
            ->each(function (TelegramAccount $account) use ($resolved): void {
                if ((string) $account->display_name !== $resolved) {
                    $account->update(['display_name' => $resolved]);

                    return;
                }

                $this->queuePush($account);
            });
    }

    /**
     * Small reconcile set for the scheduled job — NOT every verified account.
     * Event-driven push handles day-to-day; this only heals recent buyers and
     * rows Iran touched in the last half hour (missed push / host was down).
     *
     * @return \Illuminate\Support\Collection<int, TelegramAccount>
     */
    public function accountsNeedingReconcile(int $limit = 100): \Illuminate\Support\Collection
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return collect();
        }

        $limit = max(1, min(500, $limit));
        $touchSince = now()->subMinutes(self::RECENT_ACCOUNT_TOUCH_MINUTES);

        $recentBuyerUserIds = Order::query()
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where('paid_at', '>=', now()->subMinutes(self::RECENT_PAID_WINDOW_MINUTES))
            ->pluck('user_id')
            ->filter()
            ->unique();

        $recentBuyerAccounts = $recentBuyerUserIds->isEmpty()
            ? collect()
            : TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->whereIn('user_id', $recentBuyerUserIds)
                ->whereNotNull('mobile_verified_at')
                ->get();

        $recentlyTouched = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereNotNull('mobile_verified_at')
            ->where('updated_at', '>=', $touchSince)
            ->orderByDesc('updated_at')
            ->limit($limit)
            ->get();

        return $recentBuyerAccounts
            ->merge($recentlyTouched)
            ->unique('id')
            ->take($limit)
            ->values();
    }

    /**
     * Reconcile all verified production accounts (+ recent buyers even if
     * already verified) onto the foreign host. Used by the 5-minute
     * scheduled command — event-driven push covers day-to-day changes;
     * this catches anything missed while the host was unreachable.
     *
     * @return int Number of accounts queued
     */
    public function queuePushAllVerified(int $limit = 5000): int
    {
        $queued = 0;
        foreach ($this->accountsToSync($limit) as $account) {
            $this->queuePush($account);
            $queued++;
        }

        return $queued;
    }

    /**
     * Scheduled reconcile — only users who likely missed an event push.
     *
     * @return int Number of accounts queued
     */
    public function queueReconcileBatch(int $limit = 100): int
    {
        $queued = 0;
        foreach ($this->accountsNeedingReconcile($limit) as $account) {
            $this->queuePush($account);
            $queued++;
        }

        return $queued;
    }

    /**
     * All verified accounts (+ accounts of users with a recently paid order,
     * even if already synced) — the 5-minute reconcile set shared by the
     * queued path above and the `--sync` immediate path in the console command.
     *
     * @return \Illuminate\Support\Collection<int, TelegramAccount>
     */
    public function accountsToSync(int $limit = 5000): \Illuminate\Support\Collection
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return collect();
        }

        $verified = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereNotNull('mobile_verified_at')
            ->orderByDesc('updated_at')
            ->limit(max(1, $limit))
            ->get();

        $recentBuyerUserIds = Order::query()
            ->whereIn('status', ['paid', 'fulfilled'])
            ->where('paid_at', '>=', now()->subMinutes(self::RECENT_PAID_WINDOW_MINUTES))
            ->pluck('user_id')
            ->filter()
            ->unique();

        $recentBuyerAccounts = $recentBuyerUserIds->isEmpty()
            ? collect()
            : TelegramAccount::query()
                ->where('telegram_bot_id', $bot->id)
                ->whereIn('user_id', $recentBuyerUserIds)
                ->whereNotNull('mobile_verified_at')
                ->get();

        return $verified->merge($recentBuyerAccounts)->unique('id')->values();
    }

    /**
     * Push snapshot + send Telegram message from the host immediately (event-driven, no cron).
     *
     * @param  array<string, mixed>  $options
     */
    /**
     * Pre-provisions access on the host for a buyer who has no
     * production-bot `TelegramAccount` yet (bought on the website, never
     * started the bot). Keyed by mobile — see PushTelegramHostSyncJob and
     * TelegramHostPushService::pushMobileAccess() on Iran, PendingMobileAccess
     * + HostRegistrationFlow::contact() on the host.
     */
    public function queuePushMobileAccess(User $user): void
    {
        $this->pushMobileAccessImmediate($user);
    }

    /** @return list<int> */
    private function ownedProductIdsFromOrders(int $userId): array
    {
        $user = User::query()->find($userId);

        return $user !== null
            ? $this->ownership->ownedProductIdsForUser($user)
            : [];
    }

    /**
     * One-off backfill for buyers who paid *before* the mobile pre-provisioning
     * push existed, or whose order was inserted directly (e.g. bulk CSV
     * import via SeminarOrderImportService) without ever going through
     * FulfillOrderJob — so they were never queued. Only targets users with
     * no production-bot TelegramAccount at all (never started the bot).
     *
     * @return int Number of users queued
     */
    public function queuePushMobileAccessForAllMissing(int $limit = 5000): int
    {
        $bot = TelegramBot::query()->where('key', 'production')->first();
        if ($bot === null) {
            return 0;
        }

        $linkedUserIds = TelegramAccount::query()
            ->where('telegram_bot_id', $bot->id)
            ->whereNotNull('user_id')
            ->pluck('user_id');

        $buyerUserIds = Order::query()
            ->whereIn('status', ['paid', 'fulfilled'])
            ->whereNotNull('user_id')
            ->whereNotIn('user_id', $linkedUserIds)
            ->distinct()
            ->pluck('user_id')
            ->take(max(1, $limit));

        $queued = 0;
        User::query()
            ->whereIn('id', $buyerUserIds)
            ->whereNotNull('mobile')
            ->where('mobile', '!=', '')
            ->chunkById(200, function ($users) use (&$queued): void {
                foreach ($users as $user) {
                    $this->queuePushMobileAccess($user);
                    $queued++;
                }
            });

        return $queued;
    }

    public function pushMobileAccessImmediate(User $user): bool
    {
        $mobile = trim((string) $user->mobile);
        if ($mobile === '') {
            return false;
        }

        $preProvision = $this->snapshots->mobilePreProvisionPayload($user->fresh(['profile', 'identityProfile']));
        if ($preProvision === [] || ($preProvision['owned_product_ids'] ?? []) === []) {
            return false;
        }

        $ownedProductIds = array_map('intval', (array) $preProvision['owned_product_ids']);
        $displayName = (string) ($preProvision['display_name'] ?? StudentDisplayName::fromUser($user));
        $push = app(TelegramHostPushService::class);
        $ok = $push->pushMobileAccess($mobile, $ownedProductIds, $displayName, $preProvision);

        if (! $ok) {
            PushTelegramHostSyncJob::mobileAccessNow($mobile, $ownedProductIds, $displayName, $preProvision);
        }

        return $ok;
    }

    public function pushPaidOrderNotification(TelegramAccount $account, array $notification): bool
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production') {
            return false;
        }

        if (! $this->notificationHasContent($notification)) {
            return false;
        }

        $payload = $this->snapshots->accountPayload($account->fresh(['user', 'bot']));
        $push = app(TelegramHostPushService::class);
        $ok = $push->pushAccountWithNotification($payload, $notification);

        if (! $ok) {
            PushTelegramHostSyncJob::dispatchNow('push_account', [
                'account' => $payload,
                'notification' => $notification,
            ]);
        }

        return $ok;
    }

    /** @param array<string, mixed> $notification */
    private function notificationHasContent(array $notification): bool
    {
        if (trim((string) ($notification['text'] ?? '')) !== '') {
            return true;
        }

        return trim((string) ($notification['template_key'] ?? '')) !== '';
    }
}
