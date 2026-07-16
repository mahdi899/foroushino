<?php

namespace App\Services\Family;

use App\Enums\Family\FamilyCommentRejectionReason;
use App\Enums\Family\FamilyCommentStatus;
use App\Models\FamilyComment;
use App\Services\AdminAuditLogger;
use App\Services\Family\FamilyNotificationService;
use Illuminate\Support\Facades\Log;

/** Applies AI-assisted auto moderation for pending family comments. */
class FamilyCommentModerationService
{
    public function __construct(
        private readonly FamilyAiSettingsService $aiSettings,
        private readonly FamilyStatsService $stats,
        private readonly FamilyNotificationService $notifications,
        private readonly AdminAuditLogger $audit,
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
            $this->reject($comment, FamilyCommentRejectionReason::Spam, 'رد خودکار توسط AI — ریسک بالا');

            return;
        }

        if ($this->hasBlockingSignal($signals)) {
            $this->reject($comment, FamilyCommentRejectionReason::Spam, 'رد خودکار توسط AI — سیگنال مشکوک');

            return;
        }

        if ($risk <= $this->aiSettings->riskApproveThreshold()) {
            $this->approve($comment, auto: true);
        }
    }

    /** @param  list<string>  $signals */
    private function hasBlockingSignal(array $signals): bool
    {
        $blocked = ['spam', 'advertising', 'phone_number'];

        return array_intersect($blocked, $signals) !== [];
    }

    private function approve(FamilyComment $comment, bool $auto = false): void
    {
        $comment->update([
            'status' => FamilyCommentStatus::Approved,
            'approved_at' => now(),
            'moderated_by' => null,
        ]);

        $this->stats->incrementApprovedComments((int) $comment->post_id, (int) $comment->family_id);

        if ($comment->user) {
            $this->notifications->commentApproved($comment->user);
        }

        $this->audit->log(null, $auto ? 'family.comment_auto_approved' : 'family.comment_approved', $comment, [
            'ai_risk_score' => $comment->ai_risk_score,
        ]);

        Log::channel('ai')->info('Family comment auto-approved', ['comment_id' => $comment->id]);
    }

    private function reject(FamilyComment $comment, FamilyCommentRejectionReason $reason, string $note): void
    {
        $comment->update([
            'status' => FamilyCommentStatus::Rejected,
            'rejection_reason' => $reason,
            'rejection_note' => $note,
            'rejected_at' => now(),
            'moderated_by' => null,
        ]);

        if ($comment->user) {
            $this->notifications->commentRejected($comment->user, $note);
        }

        $this->audit->log(null, 'family.comment_auto_rejected', $comment, [
            'reason' => $reason->value,
            'ai_risk_score' => $comment->ai_risk_score,
        ]);

        Log::channel('ai')->info('Family comment auto-rejected', ['comment_id' => $comment->id]);
    }
}
