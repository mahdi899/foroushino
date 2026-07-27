<?php

namespace App\Console\Commands;

use App\Jobs\Family\SendFamilyDailyUnreadPushJob;
use App\Models\PushSubscription;
use App\Services\WebPushSender;
use Illuminate\Console\Command;

class SendWebPushTestCommand extends Command
{
    protected $signature = 'webpush:test
                            {user_id? : Optional user id — otherwise all family subscriptions get a test ping}
                            {--digest : Run the real hourly unread digest job instead of a test payload}
                            {--force : Ignore last_notified cooldown by clearing it before digest}';

    protected $description = 'Send a Family Web Push test (or run the unread digest now)';

    public function handle(WebPushSender $webPush): int
    {
        if (! $webPush->isConfigured()) {
            $this->error('VAPID keys are not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).');

            return self::FAILURE;
        }

        if ($this->option('digest')) {
            return $this->runDigest();
        }

        $query = PushSubscription::query()->where('channel', 'family');
        if ($this->argument('user_id')) {
            $query->where('user_id', (int) $this->argument('user_id'));
        }

        $subs = $query->orderBy('id')->get();
        if ($subs->isEmpty()) {
            $this->warn('No family push subscriptions found.');

            return self::FAILURE;
        }

        $url = rtrim((string) config('family.entry.base_url', config('app.url')), '/').'/';
        $sent = 0;
        $failed = 0;

        foreach ($subs as $subscription) {
            $ok = $webPush->send($subscription, [
                'title' => 'تست اعلان خانواده',
                'body' => 'اگر این را می‌بینی، پوش نوتیفیکیشن درست کار می‌کند.',
                'url' => $url,
                'tag' => 'family-push-test',
                'badge' => 1,
            ]);

            if ($ok) {
                $sent++;
                $this->info("OK user={$subscription->user_id} id={$subscription->id}");
            } else {
                $failed++;
                $this->error("FAIL user={$subscription->user_id} id={$subscription->id}");
            }
        }

        $this->newLine();
        $this->line("Done. sent={$sent} failed={$failed}");

        return $failed > 0 && $sent === 0 ? self::FAILURE : self::SUCCESS;
    }

    private function runDigest(): int
    {
        if ($this->option('force')) {
            $query = PushSubscription::query()->where('channel', 'family');
            if ($this->argument('user_id')) {
                $query->where('user_id', (int) $this->argument('user_id'));
            }
            $cleared = $query->update(['last_notified_at' => null]);
            $this->line("Cleared last_notified_at on {$cleared} subscription(s).");
        }

        $this->info('Dispatching unread digest job…');
        SendFamilyDailyUnreadPushJob::dispatchSync();
        $this->info('Digest finished (see laravel.log for family.unread_push.done).');

        return self::SUCCESS;
    }
}
