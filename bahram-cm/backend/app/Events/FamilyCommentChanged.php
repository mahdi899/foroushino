<?php

namespace App\Events;

use App\Http\Resources\V1\Family\FamilyCommentResource;
use App\Models\FamilyComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FamilyCommentChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public FamilyComment $comment,
        public string $action,
        public ?int $approvedCommentsCount = null,
    ) {}

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel(
                'family.'.$this->comment->family_id.'.post.'.$this->comment->post_id.'.comments'
            ),
        ];
    }

    public function broadcastAs(): string
    {
        return 'family.comment.changed';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $payload = [
            'action' => $this->action,
            'post_id' => (int) $this->comment->post_id,
            'family_id' => (int) $this->comment->family_id,
            'comment_id' => (int) $this->comment->id,
        ];

        if ($this->approvedCommentsCount !== null) {
            $payload['approved_comments_count'] = $this->approvedCommentsCount;
        }

        if (in_array($this->action, ['created', 'approved', 'updated'], true)) {
            $this->comment->loadMissing(['user:id,name,is_admin', 'user.profile']);
            $payload['comment'] = FamilyCommentResource::toRealtimeArray($this->comment);
        }

        return $payload;
    }
}
