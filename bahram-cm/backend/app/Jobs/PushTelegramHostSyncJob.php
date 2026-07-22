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

    /** @param  array<string, mixed>  $extra */
    public function __construct(
        public readonly string $action,
        public readonly array $extra = [],
    ) {}

    public function handle(TelegramHostPushService $push): void
    {
        match ($this->action) {
            'refresh_bootstrap' => $push->refreshBootstrap(),
            'refresh_catalog' => $push->refreshCatalog(),
            'refresh_all' => $push->refreshAll(),
            'push_account' => $push->pushAccount((array) ($this->extra['account'] ?? [])),
            default => $push->refreshAll(),
        };
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
}
