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
            'refresh_bootstrap' => $push->runAction('refresh_bootstrap'),
            'refresh_catalog' => $push->runAction('refresh_catalog'),
            'refresh_all' => $push->runAction('refresh_all'),
            'push_account' => $push->runAction('push_account', ['account' => (array) ($this->extra['account'] ?? [])]),
            default => $push->runAction('refresh_all'),
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
}
