<?php

namespace App\Support;

use App\Models\Team;

final class SupervisorCapacity
{
    public const TEAMS_PER_SUPERVISOR = 5;

    public static function supervisedTeamCount(int $supervisorId): int
    {
        return Team::query()->where('supervisor_id', $supervisorId)->count();
    }

    public static function hasRoomForTeam(int $supervisorId): bool
    {
        return self::supervisedTeamCount($supervisorId) < self::TEAMS_PER_SUPERVISOR;
    }
}
