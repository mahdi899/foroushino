<?php

namespace App\Actions\Identity;

use App\Enums\IdentityArtifactType;
use App\Enums\IdentityReasonCode;
use App\Enums\IdentityReviewAction;
use App\Enums\IdentityVerificationStatus;
use App\Enums\SmsEventKey;
use App\Models\IdentityVerificationReview;
use App\Models\IdentityVerificationSubmission;
use App\Services\Identity\IdentityArtifactStorage;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FlagMissingIdentityArtifacts
{
    private const CORRECTION_NOTE = 'به‌دلیل خطای فنی سرور، فایل‌های این پرونده در دسترس نیست. لطفاً کارت ملی و ویدیوی سلفی را دوباره آپلود کنید.';

    /** @var list<string> */
    private const CORRECTION_ITEMS = [
        'تصویر کارت ملی خوانا نیست',
        'ویدیوی سلفی مناسب نیست',
    ];

    public function __construct(
        private readonly IdentityArtifactStorage $storage,
        private readonly InAppNotificationService $notifications,
        private readonly SmsService $sms,
    ) {}

    /**
     * @return array{scanned: int, flagged: int, notified: int}
     */
    public function flagQueueSubmissions(bool $notify = false, bool $dryRun = false): array
    {
        $submissions = IdentityVerificationSubmission::query()
            ->whereIn('status', [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ])
            ->with(['artifacts', 'user'])
            ->orderBy('id')
            ->get();

        $stats = ['scanned' => 0, 'flagged' => 0, 'notified' => 0];

        foreach ($submissions as $submission) {
            $stats['scanned']++;

            if ($this->storage->submissionArtifactsAvailable($submission)) {
                continue;
            }

            if ($dryRun) {
                $stats['flagged']++;

                continue;
            }

            if ($this->flagSubmission($submission, $notify)) {
                $stats['flagged']++;
                if ($notify && $submission->user) {
                    $stats['notified']++;
                }
            }
        }

        return $stats;
    }

    public function flagSubmission(IdentityVerificationSubmission $submission, bool $notify = false): bool
    {
        if ($this->storage->submissionArtifactsAvailable($submission)) {
            return false;
        }

        DB::transaction(function () use ($submission): void {
            /** @var IdentityVerificationSubmission $submission */
            $submission = IdentityVerificationSubmission::query()
                ->whereKey($submission->id)
                ->lockForUpdate()
                ->firstOrFail();

            $submission->loadMissing('artifacts');

            foreach ($submission->artifacts as $artifact) {
                if (! $this->storage->exists($artifact)) {
                    $artifact->delete();
                }
            }

            $submission->update([
                'status' => IdentityVerificationStatus::NeedsCorrection,
                'required_corrections' => self::CORRECTION_ITEMS,
                'reviewed_at' => now(),
            ]);

            IdentityVerificationReview::query()->create([
                'submission_id' => $submission->id,
                'reviewer_id' => null,
                'action' => IdentityReviewAction::RequestCorrection,
                'reason_code' => IdentityReasonCode::Other,
                'reviewer_note' => self::CORRECTION_NOTE,
                'correction_items' => self::CORRECTION_ITEMS,
            ]);

            $submission->identityProfile()?->update([
                'identity_status' => IdentityVerificationStatus::NeedsCorrection,
            ]);
        });

        $submission = $submission->fresh(['user']);

        if ($notify && $submission?->user) {
            $this->notifications->identityNeedsCorrection($submission->user);

            if ($submission->user->mobile) {
                $this->sms->sendEvent(
                    SmsEventKey::IdentityVerificationNeedsCorrection,
                    $submission->user->mobile,
                    ['{name}' => $submission->user->name ?: $submission->first_name],
                    $submission->user->id,
                );
            }
        }

        return true;
    }

    /** @return Collection<int, IdentityVerificationSubmission> */
    public function queueSubmissionsWithMissingArtifacts(): Collection
    {
        return IdentityVerificationSubmission::query()
            ->whereIn('status', [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ])
            ->with('artifacts')
            ->orderBy('id')
            ->get()
            ->filter(fn (IdentityVerificationSubmission $s) => ! $this->storage->submissionArtifactsAvailable($s))
            ->values();
    }
}
