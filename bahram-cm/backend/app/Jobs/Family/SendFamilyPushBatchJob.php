<?php

namespace App\Jobs\Family;

use App\Models\PushSubscription;
use App\Services\WebPushSender;
use Illuminate\Bus\Batchable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Sends a single Web Push payload to a small, fixed batch of subscriptions.
 *
 * Kept intentionally small (see `family.push_batch_size`) so many of these
 * jobs can run concurrently across Horizon workers instead of one giant job
 * looping serially over every subscription — this is what keeps a fan-out
 * to ~20k members cheap: each worker only ever holds a handful of HTTP
 * requests to the push provider (FCM/Mozilla/Apple) in flight at once, and
 * the work is naturally parallelized by adding more queue workers.
 *
 * @see \App\Jobs\Family\DispatchFamilyPostPushJob for the fan-out entry point
 * @see \App\Jobs\Family\SendFamilyUserPushJob for the single-user (reply) case
 */
class SendFamilyPushBatchJob implements ShouldQueue
{
    use Batchable, Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 60;

    /**
     * @param  list<int>  $subscriptionIds
     * @param  array{title: string, body: string, url?: string, tag?: string, badge?: int}  $payload
     */
    public function __construct(
        public readonly array $subscriptionIds,
        public readonly array $payload,
    ) {
        $this->onQueue(config('family.queues.notifications', 'family-notifications'));
    }

    public function handle(WebPushSender $webPush): void
    {
        if ($this->batch()?->cancelled()) {
            return;
        }

        if (! $webPush->isConfigured() || $this->subscriptionIds === []) {
            return;
        }

        $sent = 0;
        $failed = 0;

        PushSubscription::query()
            ->whereIn('id', $this->subscriptionIds)
            ->each(function (PushSubscription $subscription) use ($webPush, &$sent, &$failed) {
                $webPush->send($subscription, $this->payload) ? $sent++ : $failed++;
            });

        Log::info('family.push_batch.done', [
            'requested' => count($this->subscriptionIds),
            'sent' => $sent,
            'failed' => $failed,
        ]);
    }
}
