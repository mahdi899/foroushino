<?php

declare(strict_types=1);

namespace Tests\Unit\Telegram;

use App\Jobs\PushTelegramHostSyncJob;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class TelegramHostQueueConfigTest extends TestCase
{
    public function test_horizon_supervisor_telegram_includes_host_queue_first(): void
    {
        $queues = config('horizon.defaults.supervisor-telegram.queue');

        $this->assertIsArray($queues);
        $this->assertSame('telegram-host', $queues[0]);
        $this->assertContains('telegram-inbound', $queues);
        $this->assertContains('telegram-replies', $queues);
    }

    public function test_push_telegram_host_sync_job_uses_fast_backoff(): void
    {
        $job = new PushTelegramHostSyncJob('push_account', ['account' => ['telegram_user_id' => 1]]);

        $this->assertSame([5, 15, 60, 120, 300, 600], $job->backoff);
        $this->assertSame(45, $job->timeout);
    }

    public function test_account_now_dispatches_sync_immediately(): void
    {
        Bus::fake();

        PushTelegramHostSyncJob::accountNow(['telegram_user_id' => 42]);

        Bus::assertDispatchedSync(PushTelegramHostSyncJob::class, function (PushTelegramHostSyncJob $job): bool {
            return $job->action === 'push_account'
                && (int) ($job->extra['account']['telegram_user_id'] ?? 0) === 42;
        });
    }
}
