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
    /** Catch any purchase whose immediate push_account failed/was skipped (circuit open, host down). */
    private const RECENT_PAID_WINDOW_MINUTES = 60;

    public function __construct(private readonly TelegramHostAccountSnapshotService $snapshots) {}

    public function queuePush(TelegramAccount $account): void
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production') {
            return;
        }

        PushTelegramHostSyncJob::account($this->snapshots->accountPayload($account->fresh(['user', 'bot'])));
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
        $mobile = trim((string) $user->mobile);
        if ($mobile === '') {
            return;
        }

        $ownedProductIds = $this->ownedProductIdsFromOrders($user->id);
        if ($ownedProductIds === []) {
            return;
        }

        PushTelegramHostSyncJob::mobileAccess($mobile, $ownedProductIds, StudentDisplayName::fromUser($user));
    }

    /** @return list<int> */
    private function ownedProductIdsFromOrders(int $userId): array
    {
        return Order::query()
            ->where('user_id', $userId)
            ->whereIn('status', ['paid', 'fulfilled'])
            ->pluck('product_id')
            ->filter()
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
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

    public function pushPaidOrderNotification(TelegramAccount $account, string $text, array $options = []): bool
    {
        $account->loadMissing('bot');
        if ($account->bot?->key !== 'production' || trim($text) === '') {
            return false;
        }

        $payload = $this->snapshots->accountPayload($account->fresh(['user', 'bot']));
        $push = app(TelegramHostPushService::class);
        $ok = $push->pushAccountWithNotification($payload, [
            'text' => $text,
            'options' => $options,
        ]);

        if (! $ok) {
            PushTelegramHostSyncJob::dispatch('push_account', [
                'account' => $payload,
                'notification' => ['text' => $text, 'options' => $options],
            ]);
        }

        return $ok;
    }
}
