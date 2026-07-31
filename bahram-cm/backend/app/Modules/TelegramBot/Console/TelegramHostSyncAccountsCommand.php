<?php

namespace App\Modules\TelegramBot\Console;

use App\Modules\TelegramBot\Models\TelegramAccount;
use App\Services\TelegramHostAccountSnapshotService;
use App\Services\TelegramHostAccountSync;
use App\Services\TelegramHostPushService;
use Illuminate\Console\Command;

class TelegramHostSyncAccountsCommand extends Command
{
    protected $signature = 'telegram:host-sync-accounts
        {--limit=100 : Max accounts to sync}
        {--sync : Push immediately (no queue) so host gets accounts now}
        {--skip-catalog : Skip catalog/bootstrap refresh (accounts only)}
        {--reconcile-only : Only recent buyers + recently touched accounts (default for schedule)}
        {--full : Push all verified accounts up to limit (heavy — manual backfill)}';

    protected $description = 'Push Telegram accounts to the external host. Default: small reconcile batch (event-driven handles normal traffic).';

    public function handle(
        TelegramHostAccountSync $sync,
        TelegramHostAccountSnapshotService $snapshots,
        TelegramHostPushService $push,
    ): int {
        $limit = max(1, (int) $this->option('limit'));

        if (! $this->option('skip-catalog')) {
            $this->refreshCatalogAndBootstrap($push);
        }

        if ($this->option('sync')) {
            $collection = $this->option('full')
                ? $sync->accountsToSync($limit)
                : $sync->accountsNeedingReconcile($limit);
            $ok = $this->pushNow($sync, $snapshots, $push, $collection);

            $this->info("Pushed {$ok['pushed']} account(s) to host ({$ok['failed']} failed).");

            return $ok['failed'] > 0 ? self::FAILURE : self::SUCCESS;
        }

        if ($this->option('full')) {
            $queued = $sync->queuePushAllVerified($limit);
            $this->info("Queued {$queued} verified account(s) for host push (full scan).");

            return self::SUCCESS;
        }

        $queued = $sync->queueReconcileBatch($limit);
        $this->info("Queued {$queued} account(s) for reconcile push (recent buyers / touched rows only).");

        return self::SUCCESS;
    }

    private function refreshCatalogAndBootstrap(TelegramHostPushService $push): void
    {
        $catalogOk = $push->refreshCatalog();
        $bootstrapOk = $push->refreshBootstrap();
        $this->line('Catalog refresh: '.($catalogOk ? 'ok' : 'skipped/failed'));
        $this->line('Bootstrap refresh: '.($bootstrapOk ? 'ok' : 'skipped/failed'));
    }

    /**
     * @param  \Illuminate\Support\Collection<int, TelegramAccount>  $accounts
     * @return array{pushed: int, failed: int}
     */
    private function pushNow(
        TelegramHostAccountSync $sync,
        TelegramHostAccountSnapshotService $snapshots,
        TelegramHostPushService $push,
        \Illuminate\Support\Collection $accounts,
    ): array {
        $pushed = 0;
        $failed = 0;

        $accounts->each(function (TelegramAccount $account) use ($snapshots, $push, &$pushed, &$failed): void {
            $payload = $snapshots->accountPayload($account->fresh(['user', 'bot']));
            if ($push->pushAccount($payload)) {
                $pushed++;
                $this->line('  ✓ '.$account->telegram_user_id);
            } else {
                $failed++;
                $this->warn('  ✗ '.$account->telegram_user_id);
            }
        });

        return ['pushed' => $pushed, 'failed' => $failed];
    }
}
