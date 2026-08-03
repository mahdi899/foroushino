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
                $this->mobilePreProvisionFromPayload($payload),
            ),
            'reset_registration' => $this->push->resetRegistration(
                (int) ($payload['telegram_user_id'] ?? 0),
                isset($payload['old_mobile']) ? (string) $payload['old_mobile'] : null,
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

    /** @param  array<string, mixed>  $payload */
    private function mobilePreProvisionFromPayload(array $payload): ?array
    {
        $extra = [];
        if (isset($payload['user_id'])) {
            $extra['user_id'] = (int) $payload['user_id'];
        }
        if (isset($payload['verification_level'])) {
            $extra['verification_level'] = max(1, (int) $payload['verification_level']);
        }
        if (is_array($payload['snapshot'] ?? null)) {
            $extra['snapshot'] = $payload['snapshot'];
        }

        return $extra === [] ? null : $extra;
    }
}
