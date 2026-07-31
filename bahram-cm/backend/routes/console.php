<?php

use App\Jobs\Family\AggregateFamilyDailyMetricsJob;
use App\Jobs\Family\CalculateFamilyDnaSnapshotJob;
use App\Jobs\Family\RebuildFamilyBehaviorProfilesJob;
use App\Jobs\Family\SendFamilyDailyUnreadPushJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('telegram:cleanup')->hourly()->onOneServer();
Schedule::command('telegram:reconcile-webhook')->everyTwoMinutes()->onOneServer();
Schedule::command('telegram:host-push-retry')->everyThreeMinutes()->onOneServer();
// Event-driven push covers day-to-day; hourly-ish heal only for missed pushes while host was down.
Schedule::command('telegram:host-sync-accounts --skip-catalog --reconcile-only --limit=80')->everySixHours()->onOneServer();
// Heal host bootstrap (reports group, messages, flags) without blasting all accounts.
Schedule::call(static fn () => \App\Jobs\PushTelegramHostSyncJob::bootstrap())
    ->name('telegram-host-push-bootstrap')
    ->hourly()
    ->onOneServer();
Schedule::command('telegram:health-check')->hourly()->onOneServer();
Schedule::command('telegram:retry-failed-updates')->everyTenMinutes()->onOneServer();
Schedule::command('telegram:audit-destination-memberships')->dailyAt('04:00')->onOneServer();

Schedule::command('chatbot:purge-old')->dailyAt('03:00');
Schedule::command('orders:expire-pending')->everyFifteenMinutes()->onOneServer();
Schedule::command('telegram:remind-c2c-reviews')->dailyAt('10:00')->onOneServer();
Schedule::command('backup:database')->everyFiveMinutes();
Schedule::command('backup:upload-download-host')->weeklyOn(0, '03:30')->onOneServer();

// Family analytics — read models are rebuildable; schedule keeps dashboards fast.
// Queue is passed as Schedule::job()'s 2nd arg — CallbackEvent (unlike Event) has no onQueue().
Schedule::job(new AggregateFamilyDailyMetricsJob(), config('family.queues.analytics', 'family-analytics'))
    ->dailyAt('02:00')
    ->onOneServer();

Schedule::job(new RebuildFamilyBehaviorProfilesJob(), config('family.queues.analytics', 'family-analytics'))
    ->dailyAt('02:30')
    ->onOneServer();

Schedule::job(new CalculateFamilyDnaSnapshotJob(), config('family.queues.analytics', 'family-analytics'))
    ->weeklyOn(1, '03:00')
    ->onOneServer();

Schedule::command('family:publish-scheduled')->everyMinute()->onOneServer();

// Family PWA — hourly unread digest (only if member has unseen posts).
Schedule::job(new SendFamilyDailyUnreadPushJob(), config('family.queues.notifications', 'family-notifications'))
    ->hourly()
    ->when(fn () => (bool) config('webpush.family_daily.enabled', true))
    ->onOneServer();

Schedule::command('media:purge-local-copies --limit=300')
    ->dailyAt('04:30')
    ->onOneServer()
    ->when(fn () => \App\Support\MediaFtpConnection::isReady());
