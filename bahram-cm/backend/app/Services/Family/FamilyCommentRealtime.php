<?php

namespace App\Services\Family;

use App\Events\FamilyCommentChanged;
use App\Events\FamilyFeedUpdated;
use App\Models\FamilyComment;
use App\Models\FamilyPost;
use App\Support\SafeBroadcast;
use Illuminate\Support\Facades\DB;

/**
 * Fire-and-forget comment realtime + feed comment-count pings.
 * Never blocks the write path when Reverb is down.
 *
 * Future: manager moderation channel can hook here without changing callers.
 */
class FamilyCommentRealtime
{
    public function __construct(
        private readonly FamilyStatsService $stats,
    ) {}

    public function visibleCreated(FamilyComment $comment): void
    {
        $this->publish($comment, 'created', true);
    }

    public function visibleApproved(FamilyComment $comment): void
    {
        $this->publish($comment, 'approved', true);
    }

    public function visibleUpdated(FamilyComment $comment): void
    {
        $this->publish($comment, 'updated', false);
    }

    public function visibleRemoved(FamilyComment $comment): void
    {
        $this->publish($comment, 'removed', true);
    }

    private function publish(FamilyComment $comment, string $action, bool $withCount): void
    {
        $commentId = (int) $comment->id;
        $postId = (int) $comment->post_id;
        $familyId = (int) $comment->family_id;

        $fire = function () use ($comment, $action, $withCount, $commentId, $postId, $familyId): void {
            $fresh = FamilyComment::query()
                ->with(['user:id,name,is_admin', 'user.profile'])
                ->find($commentId);

            if (! $fresh && $action !== 'removed') {
                return;
            }

            $target = $fresh ?? $comment;
            $count = $withCount
                ? $this->stats->approvedCommentsCount($postId, $familyId)
                : null;

            SafeBroadcast::optionally(
                fn () => broadcast(new FamilyCommentChanged($target, $action, $count))
            );

            if ($withCount) {
                $post = FamilyPost::query()->find($postId);
                if ($post) {
                    SafeBroadcast::optionally(
                        fn () => broadcast(new FamilyFeedUpdated($post, 'comments_count', $count, $familyId))
                    );
                }
            }
        };

        if (DB::transactionLevel() > 0) {
            DB::afterCommit($fire);
        } else {
            $fire();
        }
    }
}
