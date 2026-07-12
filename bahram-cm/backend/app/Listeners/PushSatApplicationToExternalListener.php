<?php

namespace App\Listeners;

use App\Events\SatApplicationAccepted;
use App\Services\Sat\SatOutboundSyncService;

class PushSatApplicationToExternalListener
{
    public function __construct(private readonly SatOutboundSyncService $sync) {}

    public function handle(SatApplicationAccepted $event): void
    {
        $this->sync->syncAcceptedApplication($event->application);
    }
}
