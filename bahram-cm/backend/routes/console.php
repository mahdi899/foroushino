<?php

use App\Jobs\Family\AggregateFamilyDailyMetricsJob;
use App\Jobs\Family\CalculateFamilyDnaSnapshotJob;
use App\Jobs\Family\RebuildFamilyBehaviorProfilesJob;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('telegram:cleanup')->dailyAt('04:10')->onOneServer();
Schedule::command('telegram:reconcile-webhook')->everyMinute()->onOneServer();
Schedule::command('telegram:health-check')->hourly()->onOneServer();
Schedule::command('telegram:retry-failed-updates')->everyTenMinutes()->onOneServer();

Schedule::command('chatbot:purge-old')->dailyAt('03:00');
Schedule::command('backup:database')->everyMinute();
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

Schedule::command('media:purge-local-copies --limit=300')
    ->dailyAt('04:30')
    ->onOneServer()
    ->when(fn () => \App\Support\MediaFtpConnection::isReady());
