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
        {--limit=5000 : Max verified accounts to sync}
        {--sync : Push immediately (no queue) so host gets accounts now}
        {--skip-catalog : Skip catalog/bootstrap refresh (accounts only)}';

    protected $description = 'Push all verified Telegram accounts (+ recent buyers) and refresh catalog/bootstrap on the external host — the 5-minute reconcile cycle.';

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
            $ok = $this->pushNow($sync, $snapshots, $push, $limit);
            $this->info("Pushed {$ok['pushed']} account(s) to host ({$ok['failed']} failed).");

            return $ok['failed'] > 0 ? self::FAILURE : self::SUCCESS;
        }

        $queued = $sync->queuePushAllVerified($limit);
        $this->info("Queued {$queued} account(s) for host push.");

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
     * @return array{pushed: int, failed: int}
     */
    private function pushNow(
        TelegramHostAccountSync $sync,
        TelegramHostAccountSnapshotService $snapshots,
        TelegramHostPushService $push,
        int $limit,
    ): array {
        $pushed = 0;
        $failed = 0;

        $sync->accountsToSync($limit)->each(function (TelegramAccount $account) use ($snapshots, $push, &$pushed, &$failed): void {
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
