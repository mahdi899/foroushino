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

        $payload = $this->state->pendingPayload() ?? [];

        $ok = match ($action) {
            'refresh_bootstrap' => $this->push->refreshBootstrap(),
            'refresh_catalog' => $this->push->refreshCatalog(),
            'refresh_all' => $this->push->refreshAll(),
            'push_account' => $this->push->runAction('push_account', $payload),
            'push_mobile_access' => $this->push->pushMobileAccess(
                (string) ($payload['mobile'] ?? ''),
                array_map('intval', (array) ($payload['owned_product_ids'] ?? [])),
                $payload['display_name'] ?? null,
            ),
            default => $this->push->refreshAll(),
        };
        if ($ok) {
            $this->state->clear();
            Log::channel('telegram')->info('telegram.host.push_retry_ok', ['action' => $action]);

            return;
        }

        Log::channel('telegram')->warning('telegram.host.push_retry_failed', ['action' => $action]);
    }
}
