<?php

namespace App\Events;

use App\Models\Lead;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LeadAssigned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Lead $lead) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        $channels = [new PrivateChannel("user.{$this->lead->assigned_agent_id}")];

        if ($this->lead->assigned_team_id) {
            $channels[] = new PrivateChannel("team.{$this->lead->assigned_team_id}");
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'lead.assigned';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        return [
            'lead_id' => $this->lead->id,
            'status' => $this->lead->status->value,
        ];
    }
}
