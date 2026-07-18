<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\Cache;

/**
 * Short-TTL read-through cache for the aggregate dashboard/report endpoints
 * (Home::management, LiveOps::dashboard, ReportsController::*). These run
 * expensive GROUP BY / multi-count queries that are hit repeatedly by
 * polling dashboards — caching for a few seconds cuts DB load dramatically
 * with negligible staleness, the same trade-off already made for
 * `team:live:*` in {@see \App\Services\Admin\AdminDirectoryCache}.
 *
 * No observer-based invalidation: the underlying rows (leads/calls/sales/
 * follow-ups) change on nearly every request in a busy call center, so
 * per-write cache-busting would defeat the purpose. A short, fixed TTL is
 * the intentional invalidation strategy here.
 */
final class DashboardCache
{
    public const LIVE_TTL_SECONDS = 10;

    public const HOME_TTL_SECONDS = 20;

    public const REPORT_TTL_SECONDS = 60;

    /** @param  array<int|string, mixed>  $scope */
    public static function key(string $namespace, array $scope): string
    {
        ksort($scope);

        return 'dashboard:'.$namespace.':'.hash('sha256', json_encode($scope, JSON_THROW_ON_ERROR));
    }

    public static function remember(string $key, int $ttlSeconds, callable $resolver): mixed
    {
        return Cache::remember($key, $ttlSeconds, $resolver);
    }
}
