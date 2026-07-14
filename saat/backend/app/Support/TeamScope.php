<?php

namespace App\Support;

use App\Enums\RoleName;
use App\Models\User;

/** Resolves whether a user sees one team or the whole org. */
final class TeamScope
{
    public static function isOrgWide(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::Manager->value,
            RoleName::Admin->value,
            RoleName::Supervisor->value,
        ]);
    }

    /** `null` = all teams; otherwise filter by this team id. */
    public static function teamIdForQueries(User $user): ?int
    {
        return self::isOrgWide($user) ? null : $user->team_id;
    }

    public static function canPickTeam(User $user): bool
    {
        return self::isOrgWide($user);
    }
}
