<?php

namespace App\Jobs\Family;

use App\Models\FamilyMembership;
use App\Models\FamilyPostView;
use App\Models\PushSubscription;
use App\Services\Family\FeedService;
use App\Services\WebPushSender;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Daily unread digest for Family PWA — one reminder per subscribed member
 * who has unseen posts (not per-post Telegram-style spam).
 */
class SendFamilyDailyUnreadPushJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 300;

    public function __construct()
    {
        $this->onQueue(config('family.queues.notifications', 'family-notifications'));
    }

    public function handle(WebPushSender $webPush, FeedService $feed): void
    {
        if (! config('webpush.family_daily.enabled', true)) {
            return;
        }

        if (! $webPush->isConfigured()) {
            Log::info('family.daily_push.skipped', ['reason' => 'vapid_unconfigured']);

            return;
        }

        $url = $this->targetUrl();
        $sent = 0;
        $skipped = 0;

        PushSubscription::query()
            ->where('channel', 'family')
            ->orderBy('id')
            ->chunkById(100, function ($subscriptions) use ($webPush, $feed, $url, &$sent, &$skipped) {
                /** @var \Illuminate\Support\Collection<int, PushSubscription> $subscriptions */
                $userIds = $subscriptions->pluck('user_id')->unique()->values();

                $memberships = FamilyMembership::query()
                    ->with('user')
                    ->whereIn('user_id', $userIds)
                    ->get()
                    ->keyBy('user_id');

                $afterIds = FamilyPostView::query()
                    ->whereIn('user_id', $userIds)
                    ->selectRaw('user_id, family_id, MAX(post_id) as max_post_id')
                    ->groupBy('user_id', 'family_id')
                    ->get()
                    ->groupBy('user_id');

                foreach ($subscriptions as $subscription) {
                    $membership = $memberships->get($subscription->user_id);
                    if ($membership === null) {
                        $skipped++;

                        continue;
                    }

                    $familyId = (int) $membership->family_id;
                    $afterId = (int) ($afterIds->get($subscription->user_id)
                        ?->firstWhere('family_id', $familyId)
                        ?->max_post_id ?? 0);

                    $unread = $this->unreadCountFor($feed, $membership, $afterId);
                    if ($unread <= 0) {
                        $skipped++;

                        continue;
                    }

                    // Idempotent within the same calendar day (Tehran timezone via APP_TIMEZONE).
                    if (
                      $subscription->last_notified_at &&
                      $subscription->last_notified_at->isSameDay(now())
                    ) {
                        $skipped++;

                        continue;
                    }

                    $body = $unread === 1
                        ? 'امروز ۱ پیام جدید در خانواده منتظرته — بیا یه سر بزن.'
                        : str_replace(
                            ':count',
                            number_format($unread),
                            (string) config('webpush.family_daily.body_with_count'),
                        );

                    $ok = $webPush->send($subscription, [
                        'title' => (string) config('webpush.family_daily.title', 'خانواده'),
                        'body' => $body,
                        'url' => $url,
                        'tag' => 'family-daily-unread',
                        'badge' => min($unread, 99),
                    ]);

                    if ($ok) {
                        $sent++;
                    }
                }
            });

        Log::info('family.daily_push.done', compact('sent', 'skipped'));
    }

    private function unreadCountFor(FeedService $feed, FamilyMembership $membership, int $afterId): int
    {
        try {
            if ($afterId > 0) {
                return max(0, (int) ($feed->unreadSummary($afterId, $membership->user)['unread_count'] ?? 0));
            }

            // Never opened the feed: count published posts since join (same as Telegram helper).
            $joinedAt = $membership->joined_at;
            $query = \App\Models\FamilyPost::query()
                ->where('status', \App\Enums\Family\FamilyPostStatus::Published->value)
                ->whereNotNull('published_at');

            app(\App\Services\Family\PostAudienceResolver::class)
                ->scopeVisibleToFamily($query, (int) $membership->family_id);

            if ($joinedAt) {
                $query->where('published_at', '>=', $joinedAt);
            }

            return max(0, (int) $query->count());
        } catch (\Throwable $e) {
            Log::warning('family.daily_push.unread_failed', [
                'user_id' => $membership->user_id,
                'message' => $e->getMessage(),
            ]);

            return 0;
        }
    }

    private function targetUrl(): string
    {
        $explicit = config('webpush.family_daily.url');
        if (is_string($explicit) && $explicit !== '') {
            return $explicit;
        }

        $base = rtrim((string) config('family.entry.base_url', config('app.url')), '/');
        $path = trim((string) config('family.entry.path', ''), '/');

        return $path === '' ? $base.'/' : $base.'/'.$path;
    }
}
