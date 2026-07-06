<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\Exceptions\SpotPlayerException;
use App\Services\SpotPlayerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class IssueSpotPlayerLicenseJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $orderId) {}

    public function handle(SpotPlayerService $spotPlayer): void
    {
        $order = Order::query()->with('product')->find($this->orderId);

        if (! $order || filled($order->spotplayer_license_code)) {
            return;
        }

        try {
            $license = $spotPlayer->issueLicense($order);
            $order->update(['spotplayer_license_code' => $license['key'] ?? null]);
        } catch (SpotPlayerException $e) {
            Log::channel('spotplayer')->error('Could not issue SpotPlayer license for order.', [
                'order_id' => $order->id,
                'message' => $e->getMessage(),
            ]);
        }
    }
}
