<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Throttles expensive access backfill syncs (orders → course_access / entitlements).
 * Fulfillment writes authoritative rows; sync is mainly legacy backfill.
 */
class AccessSyncCache
{
    private const TTL_SECONDS = 120;

    private const SCOPES = ['course', 'reference_channel', 'seminar'];

    public static function skipSync(User $user, string $scope, callable $sync): void
    {
        $key = self::key($user->id, $scope);

        if (Cache::has($key)) {
            return;
        }

        $sync();

        Cache::put($key, 1, self::TTL_SECONDS);
    }

    public static function forget(User $user): void
    {
        self::forgetUserId($user->id);
    }

    public static function forgetUserId(int $userId): void
    {
        foreach (self::SCOPES as $scope) {
            Cache::forget(self::key($userId, $scope));
        }
    }

    private static function key(int $userId, string $scope): string
    {
        return "access_sync:{$scope}:{$userId}";
    }
}
