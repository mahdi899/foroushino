<?php

namespace App\Jobs\Family;

use App\Models\PushSubscription;
use App\Services\WebPushSender;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Web Push for a single member — e.g. when بهرام replies to their comment.
 * Resolves the user's current subscriptions at execution time (not at
 * dispatch time) so it always reflects the latest opt-in state, and stays
 * off the request/response cycle since it runs on the queue.
 */
class SendFamilyUserPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    /**
     * @param  array{title: string, body: string, url?: string, tag?: string, badge?: int}  $payload
     */
    public function __construct(
        public readonly int $userId,
        public readonly array $payload,
    ) {
        $this->onQueue(config('family.queues.notifications', 'family-notifications'));
    }

    public function handle(WebPushSender $webPush): void
    {
        if (! $webPush->isConfigured()) {
            return;
        }

        PushSubscription::query()
            ->where('user_id', $this->userId)
            ->where('channel', 'family')
            ->each(fn (PushSubscription $subscription) => $webPush->send($subscription, $this->payload));
    }
}
