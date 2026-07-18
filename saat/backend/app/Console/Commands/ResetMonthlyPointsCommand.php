<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class ResetMonthlyPointsCommand extends Command
{
    protected $signature = 'gamification:reset-monthly-points';

    protected $description = 'Zero out all user points at the start of a new monthly competition period.';

    public function handle(): int
    {
        $updated = User::query()->where('points', '>', 0)->update(['points' => 0]);

        $this->info("Reset points for {$updated} user(s).");

        return self::SUCCESS;
    }
}
