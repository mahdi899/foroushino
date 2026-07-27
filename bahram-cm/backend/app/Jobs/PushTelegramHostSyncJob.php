<?php

namespace App\Jobs;

use App\Services\TelegramHostPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class PushTelegramHostSyncJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 6;

    /** @var list<int> */
    public array $backoff = [20, 60, 120, 300, 600, 900];

    public int $timeout = 120;

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
            ),
            default => $push->refreshAll(),
        };

        if (! $ok) {
            throw new \RuntimeException('Telegram host push failed: '.$this->action);
        }
    }

    public static function bootstrap(): void
    {
        self::dispatch('refresh_bootstrap');
    }

    public static function catalog(): void
    {
        self::dispatch('refresh_catalog');
    }

    public static function all(): void
    {
        self::dispatch('refresh_all');
    }

    /** @param  array<string, mixed>  $account */
    public static function account(array $account): void
    {
        self::dispatch('push_account', ['account' => $account]);
    }

    public static function notifyUser(int $telegramUserId, string $text, array $options = []): void
    {
        self::dispatch('notify_user', [
            'telegram_user_id' => $telegramUserId,
            'text' => $text,
            'options' => $options,
        ]);
    }

    /** @param  list<int>  $ownedProductIds */
    public static function mobileAccess(string $mobile, array $ownedProductIds, ?string $displayName = null): void
    {
        self::dispatch('push_mobile_access', [
            'mobile' => $mobile,
            'owned_product_ids' => $ownedProductIds,
            'display_name' => $displayName,
        ]);
    }
}
