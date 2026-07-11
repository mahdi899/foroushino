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
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestIdentityCorrection
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
        private readonly SmsService $sms,
        private readonly InAppNotificationService $notifications,
    ) {}

    /**
     * @param  list<string>|array<int, string>  $correctionItems
     */
    public function __invoke(
        User $actor,
        IdentityVerificationSubmission $submission,
        array $correctionItems,
        ?IdentityReasonCode $reasonCode = null,
        ?string $note = null,
    ): IdentityVerificationSubmission {
        if ($correctionItems === []) {
            throw ValidationException::withMessages([
                'correction_items' => ['حداقل یک مورد اصلاح مشخص کنید.'],
            ]);
        }

        return DB::transaction(function () use ($actor, $submission, $correctionItems, $reasonCode, $note) {
            /** @var IdentityVerificationSubmission $submission */
            $submission = IdentityVerificationSubmission::query()->whereKey($submission->id)->lockForUpdate()->firstOrFail();

            if (! in_array($submission->status, [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ], true)) {
                throw ValidationException::withMessages([
                    'status' => ['این پرونده در وضعیت قابل درخواست اصلاح نیست.'],
                ]);
            }

            $submission->update([
                'status' => IdentityVerificationStatus::NeedsCorrection,
                'required_corrections' => array_values($correctionItems),
                'reviewed_at' => now(),
            ]);

            IdentityVerificationReview::query()->create([
                'submission_id' => $submission->id,
                'reviewer_id' => $actor->id,
                'action' => IdentityReviewAction::RequestCorrection,
                'reason_code' => $reasonCode,
                'reviewer_note' => $note,
                'correction_items' => array_values($correctionItems),
            ]);

            UserIdentityProfile::query()->whereKey($submission->identity_profile_id)->update([
                'identity_status' => IdentityVerificationStatus::NeedsCorrection,
            ]);

            $this->audit->log($actor, 'identity.correction_requested', $submission, [
                'submission_id' => $submission->id,
                'user_id' => $submission->user_id,
                'reason_code' => $reasonCode?->value,
            ]);

            $student = $submission->user;
            if ($student) {
                $this->notifications->identityNeedsCorrection($student);

                if ($student->mobile) {
                    $this->sms->sendEvent(
                        SmsEventKey::IdentityVerificationNeedsCorrection,
                        $student->mobile,
                        ['{name}' => $student->name ?: $submission->first_name],
                        $student->id,
                    );
                }
            }

            return $submission->fresh(['artifacts', 'reviews']);
        });
    }
}
