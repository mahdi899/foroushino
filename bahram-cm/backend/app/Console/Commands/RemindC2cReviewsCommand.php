<?php

namespace App\Console\Commands;

use App\Modules\TelegramBot\Services\TelegramCardToCardFlowService;
use Illuminate\Console\Command;

class RemindC2cReviewsCommand extends Command
{
    protected $signature = 'telegram:remind-c2c-reviews';

    protected $description = 'Daily reminder of open card-to-card orders awaiting admin review';

    public function handle(TelegramCardToCardFlowService $cardToCard): int
    {
        $sent = $cardToCard->remindPendingReviews();
        $this->info("Sent {$sent} C2C review reminder message(s).");

        return self::SUCCESS;
    }
}
