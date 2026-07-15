<?php

namespace App\Console\Commands;

use App\Support\TeamCapacity;
use Illuminate\Console\Command;

class NormalizeTeamAgentsCommand extends Command
{
    protected $signature = 'teams:normalize-agents';

    protected $description = 'Deactivate excess agents so each team has at most '.TeamCapacity::AGENTS_PER_TEAM.' active specialists.';

    public function handle(): int
    {
        $deactivated = TeamCapacity::enforceForAllTeams();

        $this->info("Deactivated {$deactivated} excess agent(s). Each team now has at most ".TeamCapacity::AGENTS_PER_TEAM.' active agents.');

        return self::SUCCESS;
    }
}
