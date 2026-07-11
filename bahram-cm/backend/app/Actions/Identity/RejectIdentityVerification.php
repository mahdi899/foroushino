<?php

namespace App\Actions\Identity;

use App\Enums\IdentityReasonCode;
use App\Enums\IdentityReviewAction;
use App\Enums\IdentityVerificationStatus;
use App\Enums\SmsEventKey;
use App\Models\IdentityVerificationReview;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\AdminAuditLogger;
use App\Services\SmsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RejectIdentityVerification
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
        private readonly SmsService $sms,
    ) {}

    public function __invoke(
        User $actor,
        IdentityVerificationSubmission $submission,
        ?IdentityReasonCode $reasonCode = null,
        ?string $note = null,
    ): IdentityVerificationSubmission {
        return DB::transaction(function () use ($actor, $submission, $reasonCode, $note) {
            /** @var IdentityVerificationSubmission $submission */
            $submission = IdentityVerificationSubmission::query()->whereKey($submission->id)->lockForUpdate()->firstOrFail();

            if (! in_array($submission->status, [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ], true)) {
                throw ValidationException::withMessages([
                    'status' => ['این پرونده قابل رد نیست.'],
                ]);
            }

            $submission->update([
                'status' => IdentityVerificationStatus::Rejected,
                'reviewed_at' => now(),
            ]);

            IdentityVerificationReview::query()->create([
                'submission_id' => $submission->id,
                'reviewer_id' => $actor->id,
                'action' => IdentityReviewAction::Reject,
                'reason_code' => $reasonCode,
                'reviewer_note' => $note,
            ]);

            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()
                ->whereKey($submission->identity_profile_id)
                ->lockForUpdate()
                ->firstOrFail();

            $profile->identity_status = IdentityVerificationStatus::Rejected;
            $profile->save();
            $profile->syncVerificationLevel();

            $this->audit->log($actor, 'identity.rejected', $submission, [
                'submission_id' => $submission->id,
                'user_id' => $submission->user_id,
                'reason_code' => $reasonCode?->value,
            ]);

            $student = $submission->user;
            if ($student?->mobile) {
                $this->sms->sendEvent(
                    SmsEventKey::IdentityVerificationRejected,
                    $student->mobile,
                    ['{name}' => $student->name ?: $submission->first_name],
                    $student->id,
                );
            }

            return $submission->fresh(['artifacts', 'reviews']);
        });
    }
}
