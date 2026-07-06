<?php

namespace App\Events;

use App\Models\Sale;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SaleConfirmed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Sale $sale) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("user.{$this->sale->agent_id}"),
            new PrivateChannel('managers'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'sale.confirmed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'sale_id' => $this->sale->id,
            'amount' => (string) $this->sale->amount,
        ];
    }
}
