<?php

namespace App\Events;

use App\Models\FamilyPost;
use App\Support\FamilyDateTime;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FamilyFeedUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public FamilyPost $post,
        public string $event = 'published',
        public ?int $approvedCommentsCount = null,
        public ?int $familyId = null,
    ) {}

    /**
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('family.feed')];
    }

    public function broadcastAs(): string
    {
        return 'family.feed.updated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $payload = [
            'post_id' => $this->post->id,
            'latest_post_id' => $this->post->id,
            'published_at' => FamilyDateTime::toApi($this->post->published_at),
            'is_important' => (bool) $this->post->is_important,
            'event' => $this->event,
        ];

        if ($this->approvedCommentsCount !== null) {
            $payload['approved_comments_count'] = $this->approvedCommentsCount;
        }

        if ($this->familyId !== null) {
            $payload['family_id'] = $this->familyId;
        }

        return $payload;
    }
}
