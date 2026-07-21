<?php

namespace App\Listeners;

use App\Events\SatApplicationAccepted;
use App\Services\Sat\SatOutboundSyncService;
use App\Support\SatIntegrationConfig;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use RuntimeException;

/**
 * Push accepted SAT applications to sat.center asynchronously so the
 * admin "accept" request stays fast. Retries only when outbound is configured.
 */
class PushSatApplicationToExternalListener implements ShouldQueue
{
    use InteractsWithQueue;

    public int $tries = 5;

    /** @var list<int> */
    public array $backoff = [5, 15, 30, 60];

    public function __construct(private readonly SatOutboundSyncService $sync) {}

    public function handle(SatApplicationAccepted $event): void
    {
        if (! SatIntegrationConfig::isReady()) {
            return;
        }

        $ok = $this->sync->syncAcceptedApplication($event->application);

        if (! $ok) {
            throw new RuntimeException('SAT outbound sync failed for application #'.$event->application->id);
        }
    }
}
