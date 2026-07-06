<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\Exceptions\SpotPlayerException;
use App\Services\SmsService;
use App\Services\SpotPlayerService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * Runs after a successful payment: issues a SpotPlayer license (if the
 * product is connected to one) and sends the purchase confirmation SMS,
 * then marks the order as fulfilled.
 */
class FulfillOrderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $backoff = 30;

    public function __construct(public int $orderId) {}

    public function handle(SpotPlayerService $spotPlayer, SmsService $sms): void
    {
        $order = Order::query()->with('product')->find($this->orderId);

        if (! $order || ! $order->isPaid()) {
            Log::channel('payment')->warning('FulfillOrderJob skipped: order not found or not paid.', [
                'order_id' => $this->orderId,
            ]);

            return;
        }

        if ($order->product && filled($order->product->spotplayer_course_id) && blank($order->spotplayer_license_code)) {
            try {
                $license = $spotPlayer->issueLicense($order);
                $order->update(['spotplayer_license_code' => $license['key'] ?? null]);
            } catch (SpotPlayerException $e) {
                Log::channel('spotplayer')->error('Could not issue SpotPlayer license during fulfillment.', [
                    'order_id' => $order->id,
                    'message' => $e->getMessage(),
                ]);
            }
        }

        if ($sms->sendPurchaseConfirmation($order->fresh('product'))) {
            $order->update(['sms_sent_at' => now()]);
        }

        $order->update(['status' => 'fulfilled']);
    }
}
