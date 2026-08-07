<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Models\FamilyComment;
use App\Models\User;
use App\Services\AdminAuditLogger;
use Illuminate\Support\Facades\Log;

/**
 * Shared comment moderation + Bahram reply writes.
 * Used by Manager API, AI auto-moderation, and member auto-approve broadcasts.
 */
class FamilyCommentModerationService
{
    public function __construct(
        private readonly FamilyAiSettingsService $aiSettings,
        private readonly FamilyStatsService $stats,
        private readonly FamilyNotificationService $notifications,
        private readonly AdminAuditLogger $audit,
        private readonly FamilyCommentRealtime $realtime,
    ) {}

    public function applyAiDecision(FamilyComment $comment): void
    {
        if ($comment->status !== FamilyCommentStatus::Pending) {
            return;
        }

        if (! $this->aiSettings->isActive() || ! $this->aiSettings->autoApproveComments()) {
            return;
        }

        $risk = (float) ($comment->ai_risk_score ?? 0);
        $signals = array_values((array) ($comment->ai_signals ?? []));

        if ($this->aiSettings->autoRejectHighRisk() && $risk >= $this->aiSettings->riskRejectThreshold()) {
            $this->reject(
                $comment,
                FamilyCommentRejectionReason::Advertisement,
                'رد خودکار توسط AI — ریسک بالا',
            );

            return;
        }

        if ($this->hasBlockingSignal($signals)) {
            $this->reject(
                $comment,
                FamilyCommentRejectionReason::Advertisement,
                'رد خودکار توسط AI — سیگنال مشکوک',
            );

            return;
        }

        if ($risk <= $this->aiSettings->riskApproveThreshold()) {
            $this->approve($comment, auto: true);
        }
    }

    public function approve(FamilyComment $comment, ?User $moderator = null, bool $auto = false): void
    {
        if ($comment->status === FamilyCommentStatus::Approved) {
            return;
        }

        $comment->update([
            'status' => FamilyCommentStatus::Approved,
            'approved_at' => now(),
            'moderated_by' => $moderator?->id,
        ]);

        $this->stats->incrementApprovedComments((int) $comment->post_id, (int) $comment->family_id);

        if ($comment->user) {
            $this->notifications->commentApproved($comment->user, (int) $comment->post_id);
        }

        $this->audit->log(
            $moderator,
            $auto ? 'family.comment_auto_approved' : 'family.comment_approved',
            $comment,
            $auto ? ['ai_risk_score' => $comment->ai_risk_score] : [],
        );

        if ($auto) {
            Log::channel('ai')->info('Family comment auto-approved', ['comment_id' => $comment->id]);
        }

        $this->realtime->visibleApproved($comment->fresh(['user.profile']) ?? $comment);
    }

    public function reject(
        FamilyComment $comment,
        FamilyCommentRejectionReason $reason,
        ?string $note = null,
        ?User $moderator = null,
    ): void {
        if ($comment->status === FamilyCommentStatus::Rejected) {
            return;
        }

        $wasApproved = $comment->status === FamilyCommentStatus::Approved;

        $comment->update([
            'status' => FamilyCommentStatus::Rejected,
            'rejection_reason' => $reason,
            'rejection_note' => $note,
            'rejected_at' => now(),
            'moderated_by' => $moderator?->id,
        ]);

        if ($wasApproved) {
            $this->stats->incrementApprovedComments((int) $comment->post_id, (int) $comment->family_id, -1);
        }

        $this->audit->log($moderator, $moderator ? 'family.comment_rejected' : 'family.comment_auto_rejected', $comment, [
            'reason' => $reason->value,
            'ai_risk_score' => $comment->ai_risk_score,
        ]);

        if ($comment->user) {
            $this->notifications->commentRejected(
                $comment->user,
                $note ?? $reason->label(),
            );
        }

        if (! $moderator) {
            Log::channel('ai')->info('Family comment auto-rejected', [
                'comment_id' => $comment->id,
                'reason' => $reason->value,
            ]);
        }

        // Pending never appeared on the public channel; only remove if it was visible.
        if ($wasApproved) {
            $this->realtime->visibleRemoved($comment);
        }
    }

    public function addApprovedReply(FamilyComment $parent, User $author, string $body): FamilyComment
    {
        $reply = FamilyComment::query()->create([
            'post_id' => $parent->post_id,
            'family_id' => $parent->family_id,
            'user_id' => $author->id,
            'parent_id' => $parent->id,
            'body' => trim($body),
            'status' => FamilyCommentStatus::Approved,
            'approved_at' => now(),
            'moderated_by' => $author->id,
        ]);

        if (! $parent->seen_by_bahram_at) {
            $parent->update(['seen_by_bahram_at' => now()]);
        }

        $this->stats->incrementApprovedComments((int) $parent->post_id, (int) $parent->family_id);

        $this->audit->log($author, 'family.bahram_replied', $parent, [
            'reply_comment_id' => $reply->id,
        ]);

        if ($parent->user) {
            $this->notifications->bahramReplied($parent->user, (int) $parent->post_id);
        }

        $reply->load(['user:id,name,is_admin', 'user.profile', 'family:id,internal_name']);

        $this->realtime->visibleCreated($reply);

        return $reply;
    }

    /** Notify viewers that an already-visible comment's public fields changed (e.g. is_important). */
    public function broadcastVisibleUpdate(FamilyComment $comment): void
    {
        if ($comment->status !== FamilyCommentStatus::Approved) {
            return;
        }

        $this->realtime->visibleUpdated($comment->loadMissing(['user:id,name,is_admin', 'user.profile']));
    }

    /** After member store auto-approves — stats already bumped by caller. */
    public function broadcastMemberCreated(FamilyComment $comment): void
    {
        if ($comment->status !== FamilyCommentStatus::Approved) {
            return;
        }

        $this->realtime->visibleCreated($comment->loadMissing(['user:id,name,is_admin', 'user.profile']));
    }

    /** @param  list<string>  $signals */
    private function hasBlockingSignal(array $signals): bool
    {
        $blocked = ['spam', 'advertising', 'phone_number'];

        return array_intersect($blocked, $signals) !== [];
    }
}
