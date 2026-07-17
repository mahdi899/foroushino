<?php

namespace App\Services\Admin;

use App\Support\TeamScope;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

final class AdminDirectoryCache
{
    private const VERSION_KEY = 'admin:directory:version';

    private const USERS_TTL_SECONDS = 30;

    private const TEAMS_TTL_SECONDS = 60;

    private const LIVE_TTL_SECONDS = 10;

    public static function usersKey(User $actor): string
    {
        return 'admin:users:'.$actor->id.':'.self::scopeHash($actor);
    }

    public static function teamsKey(User $actor): string
    {
        return 'admin:teams:'.$actor->id.':'.self::scopeHash($actor);
    }

    public static function liveKey(User $actor, ?int $teamId): string
    {
        return 'team:live:'.$actor->id.':'.($teamId ?? 'all').':'.self::scopeHash($actor);
    }

    public static function rememberUsers(User $actor, callable $resolver): mixed
    {
        return Cache::remember(self::usersKey($actor), self::USERS_TTL_SECONDS, $resolver);
    }

    public static function rememberTeams(User $actor, callable $resolver): mixed
    {
        return Cache::remember(self::teamsKey($actor), self::TEAMS_TTL_SECONDS, $resolver);
    }

    public static function rememberLive(User $actor, ?int $teamId, callable $resolver): mixed
    {
        return Cache::remember(self::liveKey($actor, $teamId), self::LIVE_TTL_SECONDS, $resolver);
    }

    public static function bump(): void
    {
        if (! Cache::has(self::VERSION_KEY)) {
            Cache::put(self::VERSION_KEY, 1, now()->addDay());

            return;
        }

        Cache::increment(self::VERSION_KEY);
    }

    private static function scopeHash(User $actor): string
    {
        $teamIds = TeamScope::supervisedTeamIds($actor);
        sort($teamIds);
        $version = (int) Cache::get(self::VERSION_KEY, 0);

        return md5(json_encode([
            'version' => $version,
            'org' => TeamScope::isOrgWide($actor),
            'teams' => $teamIds,
            'team_id' => $actor->team_id,
            'roles' => $actor->getRoleNames()->sort()->values()->all(),
        ], JSON_THROW_ON_ERROR));
    }
}
