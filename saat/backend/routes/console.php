<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('leads:release-stale-locks')->everyFiveMinutes();
Schedule::command('leads:auto-return-stale')->hourly();
Schedule::command('followups:mark-overdue')->everyFiveMinutes();
Schedule::command('performance:snapshot')->dailyAt('23:55');
Schedule::command('gamification:reset-monthly-points')->monthlyOn(1, '00:01');
Schedule::command('callcenter:process-sla')->everyTenMinutes();
Schedule::command('backup:database')->everyMinute();
Schedule::command('backup:upload-download-host')->weeklyOn(0, '03:30');
