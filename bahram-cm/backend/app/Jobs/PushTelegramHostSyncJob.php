<?php

namespace App\Jobs;

use App\Services\TelegramHostPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class PushTelegramHostSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 6;

    /** @var list<int> */
    public array $backoff = [5, 15, 60, 120, 300, 600];

    public int $timeout = 45;

    /** @param  array<string, mixed>  $extra */
    public function __construct(
        public readonly string $action,
        public readonly array $extra = [],
    ) {}

    public function handle(TelegramHostPushService $push): void
    {
        $ok = match ($this->action) {
            'refresh_bootstrap' => $push->refreshBootstrap(),
            'refresh_catalog' => $push->refreshCatalog(),
            'refresh_all' => $push->refreshAll(),
            'notify_user' => $push->runAction('notify_user', [
                'telegram_user_id' => (int) ($this->extra['telegram_user_id'] ?? 0),
                'text' => (string) ($this->extra['text'] ?? ''),
                'options' => (array) ($this->extra['options'] ?? []),
            ]),
            'push_account' => $push->runAction('push_account', [
                'account' => (array) ($this->extra['account'] ?? []),
                'notification' => (array) ($this->extra['notification'] ?? []),
            ]),
            'push_mobile_access' => $push->pushMobileAccess(
                (string) ($this->extra['mobile'] ?? ''),
                array_map('intval', (array) ($this->extra['owned_product_ids'] ?? [])),
                $this->extra['display_name'] ?? null,
                $this->mobilePreProvisionExtra(),
            ),
            default => $push->refreshAll(),
        };

        if (! $ok) {
            // Local host (php -S) is single-threaded: pushing host-sync while still
            // inside process-update deadlocks/times out. Soft-fail so admin UX and
            // scheduled reconcile can retry; production still throws for queue retries.
            if (app()->environment('local', 'testing')) {
                Log::channel('telegram')->warning('Telegram host push failed (local — ignored).', [
                    'action' => $this->action,
                ]);

                return;
            }

            throw new \RuntimeException('Telegram host push failed: '.$this->action);
        }
    }

    public static function bootstrap(): void
    {
        self::dispatchAfterResponse('refresh_bootstrap');
    }

    public static function catalog(): void
    {
        self::dispatchAfterResponse('refresh_catalog');
    }

    public static function all(): void
    {
        self::dispatchAfterResponse('refresh_all');
    }

    /** @param  array<string, mixed>  $account */
    public static function account(array $account): void
    {
        self::dispatchNow('push_account', ['account' => $account]);
    }

    public static function notifyUser(int $telegramUserId, string $text, array $options = []): void
    {
        self::dispatchNow('notify_user', [
            'telegram_user_id' => $telegramUserId,
            'text' => $text,
            'options' => $options,
        ]);
    }

    /** @param  list<int>  $ownedProductIds */
    /** @param  array<string, mixed>|null  $preProvision */
    public static function mobileAccess(string $mobile, array $ownedProductIds, ?string $displayName = null, ?array $preProvision = null): void
    {
        self::dispatchNow('push_mobile_access', self::mobileAccessPayload($mobile, $ownedProductIds, $displayName, $preProvision));
    }

    /** @param  array<string, mixed>  $extra */
    public static function dispatchNow(string $action, array $extra = []): void
    {
        self::dispatch($action, $extra)->onQueue('telegram-host');
    }

    /** @param  array<string, mixed>  $account */
    public static function accountNow(array $account): void
    {
        self::dispatchNow('push_account', ['account' => $account]);
    }

    /** @param  list<int>  $ownedProductIds */
    /** @param  array<string, mixed>|null  $preProvision */
    public static function mobileAccessNow(string $mobile, array $ownedProductIds, ?string $displayName = null, ?array $preProvision = null): void
    {
        self::dispatchNow('push_mobile_access', self::mobileAccessPayload($mobile, $ownedProductIds, $displayName, $preProvision));
    }

    /**
     * @param  list<int>  $ownedProductIds
     * @param  array<string, mixed>|null  $preProvision
     * @return array<string, mixed>
     */
    private static function mobileAccessPayload(string $mobile, array $ownedProductIds, ?string $displayName, ?array $preProvision): array
    {
        $payload = [
            'mobile' => $mobile,
            'owned_product_ids' => $ownedProductIds,
            'display_name' => $displayName,
        ];

        if ($preProvision === null) {
            return $payload;
        }

        if (isset($preProvision['user_id'])) {
            $payload['user_id'] = (int) $preProvision['user_id'];
        }
        if (isset($preProvision['verification_level'])) {
            $payload['verification_level'] = max(1, (int) $preProvision['verification_level']);
        }
        if (is_array($preProvision['snapshot'] ?? null)) {
            $payload['snapshot'] = $preProvision['snapshot'];
        }

        return $payload;
    }

    /** @return array<string, mixed>|null */
    private function mobilePreProvisionExtra(): ?array
    {
        $extra = [];
        if (isset($this->extra['user_id'])) {
            $extra['user_id'] = (int) $this->extra['user_id'];
        }
        if (isset($this->extra['verification_level'])) {
            $extra['verification_level'] = max(1, (int) $this->extra['verification_level']);
        }
        if (is_array($this->extra['snapshot'] ?? null)) {
            $extra['snapshot'] = $this->extra['snapshot'];
        }

        return $extra === [] ? null : $extra;
    }

    /** @param  array<string, mixed>  $extra */
    private static function dispatchAfterResponse(string $action, array $extra = []): void
    {
        self::dispatch($action, $extra)->afterResponse();
    }
}
