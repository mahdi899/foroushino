<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;

/** Retries pending pushes to the external Telegram host. */
class TelegramHostPushRetryService
{
    public function __construct(
        private readonly TelegramHostPushService $push,
        private readonly TelegramHostPushState $state,
        private readonly TelegramInfrastructureService $infrastructure,
    ) {}

    public function retryPending(): void
    {
        if (! $this->infrastructure->usesHostBridge()) {
            return;
        }

        $action = $this->state->pendingAction();
        if ($action === null) {
            return;
        }

        $ok = match ($action) {
            'refresh_bootstrap' => $this->push->runAction('refresh_bootstrap'),
            'refresh_catalog' => $this->push->runAction('refresh_catalog'),
            'refresh_all' => $this->push->runAction('refresh_all'),
            default => $this->push->runAction('refresh_all'),
        };
        if ($ok) {
            $this->state->clear();
            Log::channel('telegram')->info('telegram.host.push_retry_ok', ['action' => $action]);

            return;
        }

        Log::channel('telegram')->warning('telegram.host.push_retry_failed', ['action' => $action]);
    }
}
