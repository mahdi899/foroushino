<?php

namespace App\Actions\Identity;

use App\Enums\IdentityReviewAction;
use App\Enums\IdentityVerificationStatus;
use App\Enums\SmsEventKey;
use App\Events\IdentityLevel2Approved;
use App\Models\IdentityVerificationReview;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\AdminAuditLogger;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApproveIdentityVerification
{
    public function __construct(
        private readonly AdminAuditLogger $audit,
        private readonly SmsService $sms,
        private readonly SyncIdentityToUserProfile $syncProfile,
        private readonly InAppNotificationService $notifications,
    ) {}

    /**
     * @param  ?User  $actor  Null indicates a system auto-approval (e.g. PersonInfo name match).
     */
    public function __invoke(
        ?User $actor,
        IdentityVerificationSubmission $submission,
        ?string $note = null,
    ): IdentityVerificationSubmission {
        return DB::transaction(function () use ($actor, $submission, $note) {
            /** @var IdentityVerificationSubmission $submission */
            $submission = IdentityVerificationSubmission::query()->whereKey($submission->id)->lockForUpdate()->firstOrFail();

            if (! in_array($submission->status, [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ], true)) {
                throw ValidationException::withMessages([
                    'status' => ['این پرونده قابل تأیید نیست.'],
                ]);
            }

            $submission->update([
                'status' => IdentityVerificationStatus::Approved,
                'reviewed_at' => now(),
                'required_corrections' => null,
            ]);

            IdentityVerificationReview::query()->create([
                'submission_id' => $submission->id,
                'reviewer_id' => $actor?->id,
                'action' => IdentityReviewAction::Approve,
                'reviewer_note' => $note,
            ]);

            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()
                ->whereKey($submission->identity_profile_id)
                ->lockForUpdate()
                ->firstOrFail();

            $useRegistryNames = filled($submission->registry_first_name) && filled($submission->registry_last_name);

            $profile->fill([
                'first_name' => $useRegistryNames ? $submission->registry_first_name : $submission->first_name,
                'last_name' => $useRegistryNames ? $submission->registry_last_name : $submission->last_name,
                'father_name' => filled($submission->registry_father_name) ? $submission->registry_father_name : null,
                'national_code_encrypted' => $submission->national_code_encrypted,
                'national_code_hash' => $submission->national_code_hash,
                'date_of_birth' => $submission->date_of_birth,
                'gender' => $submission->gender,
                'city' => $submission->city,
                'identity_status' => IdentityVerificationStatus::Approved,
                'identity_verified_at' => now(),
                'identity_verified_by' => $actor?->id,
            ]);
            $profile->save();
            $profile->syncVerificationLevel();

            $this->audit->log($actor, 'identity.approved', $submission, [
                'submission_id' => $submission->id,
                'user_id' => $submission->user_id,
                'verification_level' => $profile->verification_level,
            ]);

            $student = $submission->user()->first();
            if ($student) {
                ($this->syncProfile)($student, $profile);

                $firstName = $submission->first_name;
                DB::afterCommit(function () use ($student, $firstName): void {
                    Bus::dispatchAfterResponse(function () use ($student, $firstName): void {
                        IdentityLevel2Approved::dispatch($student->fresh());
                        $this->notifications->identityApproved($student);

                        if ($student->mobile) {
                            $this->sms->sendEvent(
                                SmsEventKey::IdentityVerificationApproved,
                                $student->mobile,
                                ['{name}' => $student->name ?: $firstName],
                                $student->id,
                            );
                        }
                    });
                });
            }

            return $submission->fresh(['reviews', 'identityProfile']);
        });
    }
}
