<?php

namespace App\Jobs;

use App\Enums\OrderCancellationReason;
use App\Models\Order;
use App\Services\OrderCancellationNotifier;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class NotifyOrderCancelledJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $orderId,
        public readonly string $reason,
    ) {}

    public function handle(OrderCancellationNotifier $notifier): void
    {
        $order = Order::query()->with('product')->find($this->orderId);
        if ($order === null || $order->status !== 'cancelled' || $order->isPaid()) {
            return;
        }

        $reason = OrderCancellationReason::tryFrom($this->reason) ?? OrderCancellationReason::System;
        $notifier->notify($order, $reason);
    }
}
