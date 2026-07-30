<?php

namespace App\Jobs;

use App\Modules\TelegramBot\Services\TelegramCardToCardFlowService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Cancels a card-to-card order if the buyer never submitted a receipt in time.
 */
class ExpireCardToCardOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(public int $orderId) {}

    public function handle(TelegramCardToCardFlowService $cardToCard): void
    {
        $cardToCard->expireIfWaitingForReceipt($this->orderId);
    }
}
