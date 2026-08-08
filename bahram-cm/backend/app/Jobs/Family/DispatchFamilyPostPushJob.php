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
use App\Support\FamilySiteUrl;
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
 * Fans a published family post out to every member it's visible to when
 * `notify_members` is set: one shared in-app Notification row plus real device
 * push via parallel `SendFamilyPushBatchJob`s.
 *
 * Independent of the visual `is_important` badge — admins can mark a post
 * important without notifying, or notify without marking important.
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

        if ($post === null || $post->status !== FamilyPostStatus::Published || ! $post->notify_members) {
            return;
        }

        $payload = $this->buildPayload($post);
        $postLink = FamilySiteUrl::postUrl((int) $post->id);

        $notification = NotificationModel::create([
            'title' => $payload['title'],
            'body' => $payload['body'],
            'type' => InAppNotificationType::FamilyImportantPost->value,
            'link' => $postLink,
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

        Log::info('family.post_notify.dispatched', [
            'post_id' => $post->id,
            'is_important' => (bool) $post->is_important,
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
        $important = (bool) $post->is_important;

        return [
            'title' => $important ? 'پیام مهم از بهرام' : 'پیام جدید از بهرام',
            'body' => $excerpt ?: ($important
                ? 'یک پیام مهم جدید در خانواده منتشر شده است.'
                : 'یک پیام جدید در خانواده منتشر شده است.'),
            'url' => FamilySiteUrl::postUrl((int) $post->id),
            'tag' => 'family-post-notify-'.$post->id,
        ];
    }
}
