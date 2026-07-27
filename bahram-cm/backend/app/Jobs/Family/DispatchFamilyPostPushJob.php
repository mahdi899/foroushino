<?php

namespace App\Jobs\Family;

use App\Enums\Family\FamilyPostAudienceMode;
use App\Enums\Family\FamilyPostStatus;
use App\Enums\InAppNotificationType;
use App\Models\FamilyMembership;
use App\Models\FamilyPost;
use App\Models\Notification as NotificationModel;
use App\Models\PushSubscription;
use App\Services\WebPushSender;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Fans an important, published family post out to every member it's visible
 * to: one shared in-app Notification row (cheap — a handful of chunked
 * inserts, not one row per member), plus real device push notifications via
 * many small, parallel `SendFamilyPushBatchJob`s.
 *
 * Deliberately queued (never run inline from the publish request) and reads
 * membership/subscriptions in DB chunks so this scales to ~20k members
 * without holding them all in memory or blocking the admin who published.
 */
class DispatchFamilyPostPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 300;

    public function __construct(public readonly int $postId)
    {
        $this->onQueue(config('family.queues.notifications', 'family-notifications'));
    }

    public function handle(WebPushSender $webPush): void
    {
        $post = FamilyPost::query()->with(['blocks', 'targets'])->find($this->postId);

        if ($post === null || $post->status !== FamilyPostStatus::Published || ! $post->is_important) {
            return;
        }

        $payload = $this->buildPayload($post);

        $notification = NotificationModel::create([
            'title' => $payload['title'],
            'body' => $payload['body'],
            'type' => InAppNotificationType::FamilyImportantPost->value,
            'link' => '/family',
            'link_label' => 'مشاهده',
            'created_by' => $post->author_id,
        ]);

        $membershipChunkSize = (int) config('family.push.membership_chunk_size', 500);
        $pushBatchSize = (int) config('family.push.batch_size', 200);
        $pushJobs = [];
        $recipients = 0;
        $now = now();

        $this->scopedMembershipQuery($post)
            ->select(['id', 'user_id'])
            ->chunkById($membershipChunkSize, function ($chunk) use (
                $notification,
                $webPush,
                $pushBatchSize,
                &$pushJobs,
                &$recipients,
                $now,
            ) {
                $userIds = $chunk->pluck('user_id')->unique()->values();
                if ($userIds->isEmpty()) {
                    return;
                }
                $recipients += $userIds->count();

                // Plain bulk insert (bypasses Eloquent events/hydration) — this is
                // what keeps thousands of in-app recipients cheap per chunk.
                DB::table('notification_recipients')->insert(
                    $userIds->map(fn (int $userId) => [
                        'notification_id' => $notification->id,
                        'user_id' => $userId,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all(),
                );

                if (! $webPush->isConfigured()) {
                    return;
                }

                PushSubscription::query()
                    ->where('channel', 'family')
                    ->whereIn('user_id', $userIds)
                    ->pluck('id')
                    ->chunk($pushBatchSize)
                    ->each(function ($ids) use (&$pushJobs) {
                        $pushJobs[] = $ids->values()->all();
                    });
            });

        if ($pushJobs !== []) {
            Bus::batch(array_map(
                fn (array $ids) => new SendFamilyPushBatchJob($ids, $payload),
                $pushJobs,
            ))
                ->name('family-post-push-'.$post->id)
                ->allowFailures()
                ->onQueue(config('family.queues.notifications', 'family-notifications'))
                ->dispatch();
        }

        Log::info('family.important_post_push.dispatched', [
            'post_id' => $post->id,
            'recipients' => $recipients,
            'push_batches' => count($pushJobs),
        ]);
    }

    /** Narrow membership to whoever the post is actually targeted/visible to. */
    private function scopedMembershipQuery(FamilyPost $post): Builder
    {
        $query = FamilyMembership::query();

        return match ($post->audience_mode) {
            FamilyPostAudienceMode::Include => $query->whereIn('family_id', $post->targets->pluck('family_id')),
            FamilyPostAudienceMode::Exclude => $query->whereNotIn('family_id', $post->targets->pluck('family_id')),
            default => $query,
        };
    }

    /**
     * @return array{title: string, body: string, url: string, tag: string}
     */
    private function buildPayload(FamilyPost $post): array
    {
        $textBlock = $post->blocks->first(fn ($block) => filled($block->text_content));
        $excerpt = $textBlock ? Str::limit(trim((string) $textBlock->text_content), 120) : null;

        return [
            'title' => 'پیام مهم از بهرام',
            'body' => $excerpt ?: 'یک پیام مهم جدید در خانواده منتشر شده است.',
            'url' => $this->targetUrl(),
            'tag' => 'family-important-post',
        ];
    }

    private function targetUrl(): string
    {
        $base = rtrim((string) config('family.entry.base_url', config('app.url')), '/');
        $path = trim((string) config('family.entry.path', ''), '/');

        return $path === '' ? $base.'/' : $base.'/'.$path;
    }
}
