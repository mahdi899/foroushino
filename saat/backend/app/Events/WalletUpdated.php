<?php

namespace App\Events;

use App\Models\Wallet;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WalletUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Wallet $wallet) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new PrivateChannel("user.{$this->wallet->user_id}")];
    }

    public function broadcastAs(): string
    {
        return 'wallet.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'balance_available' => (string) $this->wallet->balance_available,
            'balance_pending' => (string) $this->wallet->balance_pending,
            'balance_locked' => (string) $this->wallet->balance_locked,
        ];
    }
}
