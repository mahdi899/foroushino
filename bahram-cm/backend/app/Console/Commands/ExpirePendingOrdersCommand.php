<?php

namespace App\Console\Commands;

use App\Services\OrderService;
use Illuminate\Console\Command;

class ExpirePendingOrdersCommand extends Command
{
    protected $signature = 'orders:expire-pending
                            {--ttl= : Override pending TTL in minutes}
                            {--purge-days= : Override cancelled purge retention in days}
                            {--skip-purge : Only cancel stale pending orders}';

    protected $description = 'Cancel unpaid pending orders after TTL, then purge old cancelled orders';

    public function handle(OrderService $orders, \App\Modules\TelegramBot\Services\TelegramCardToCardFlowService $cardToCard): int
    {
        $ttl = $this->option('ttl');
        $purgeDays = $this->option('purge-days');

        $c2cExpired = $cardToCard->expireStaleWaitingReceiptOrders();
        if ($c2cExpired > 0) {
            $this->info("Cancelled {$c2cExpired} stale card-to-card receipt order(s).");
        }

        $c2cReviewExpired = $cardToCard->expireStaleAwaitingReviewOrders();
        if ($c2cReviewExpired > 0) {
            $this->info("Cancelled {$c2cReviewExpired} stale card-to-card review order(s).");
        }

        $expired = $orders->expireStalePendingOrders(
            is_numeric($ttl) ? (int) $ttl : null,
        );

        $this->info("Cancelled {$expired['cancelled']} stale pending order(s).");

        if ($this->option('skip-purge')) {
            return self::SUCCESS;
        }

        $purged = $orders->purgeCancelledOrders(
            is_numeric($purgeDays) ? (int) $purgeDays : null,
        );

        $this->info("Deleted {$purged['deleted']} cancelled order(s).");

        return self::SUCCESS;
    }
}
