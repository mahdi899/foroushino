<?php

namespace App\Console\Commands;

use App\Enums\CommissionStatus;
use App\Models\Commission;
use App\Services\WalletService;
use Illuminate\Console\Command;

class ReleaseDueCommissionsCommand extends Command
{
    protected $signature = 'commissions:release-due';

    protected $description = 'Moves pending commissions whose hold window has elapsed into the agent\'s withdrawable available balance.';

    public function handle(WalletService $wallet): int
    {
        $due = Commission::query()
            ->where('status', CommissionStatus::Pending)
            ->where('available_at', '<=', now())
            ->with('agent')
            ->get();

        foreach ($due as $commission) {
            $wallet->releaseToAvailable($commission);
        }

        $this->info("Released {$due->count()} due commission(s) to available balance.");

        return self::SUCCESS;
    }
}
