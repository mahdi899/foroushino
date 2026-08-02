<?php

namespace App\Actions\Identity;

use App\Enums\IdentityArtifactType;
use App\Enums\IdentityCapability;
use App\Enums\IdentityReasonCode;
use App\Enums\IdentityReviewAction;
use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\SmsEventKey;
use App\Jobs\ProcessIdentitySubmissionChecksJob;
use App\Models\IdentityVerificationArtifact;
use App\Models\IdentityVerificationAttempt;
use App\Models\IdentityVerificationReview;
use App\Models\IdentityVerificationRoute;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\IdentityArtifactStorage;
use App\Services\Identity\IdentityDailyLimitService;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Services\InAppNotificationService;
use App\Services\SmsService;
use App\Support\IdentityVerificationMessages;
use App\Support\JalaliDate;
use App\Support\NationalCode;
use App\Support\PersianName;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class SubmitIdentityVerification
{
    public function __construct(
        private readonly EnsureIdentityProfile $ensureProfile,
        private readonly IdentityArtifactStorage $storage,
        private readonly SmsService $sms,
        private readonly IdentityVerificationProviderRegistry $registry,
        private readonly IdentityDailyLimitService $dailyLimits,
        private readonly InAppNotificationService $notifications,
    ) {}

    /**
     * @param  array{
     *     first_name: string,
     *     last_name: string,
     *     national_code: string,
     *     date_of_birth: string,
     *     gender: string,
     *     city: string,
     *     expected_video_text?: ?string,
     *     national_card?: ?UploadedFile,
     *     selfie_video?: ?UploadedFile,
     *     draft_submission_id?: ?int,
     * }  $data
     */
    public function __invoke(User $user, array $data): IdentityVerificationSubmission
    {
        $this->dailyLimits->assertCanSubmit($user);

        $cooldownKey = 'identity-submit-cooldown:'.$user->id;
        $cooldown = (int) config('bahram.identity.submit_cooldown_seconds', 60);
        if (Cache::has($cooldownKey)) {
            throw ValidationException::withMessages([
                'cooldown' => [IdentityVerificationMessages::COOLDOWN],
            ]);
        }

        $nationalCode = NationalCode::normalize($data['national_code'] ?? null);
        if (! NationalCode::isValid($nationalCode)) {
            throw ValidationException::withMessages([
                'national_code' => [IdentityVerificationMessages::INVALID_NATIONAL_CODE],
            ]);
        }

        $hash = NationalCode::hash($nationalCode);

        $submission = DB::transaction(function () use ($user, $data, $nationalCode, $hash, $cooldownKey, $cooldown) {
            $profile = ($this->ensureProfile)($user);
            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            $duplicate = UserIdentityProfile::query()
                ->where('national_code_hash', $hash)
                ->where('user_id', '!=', $user->id)
                ->exists();

            if ($duplicate) {
                throw ValidationException::withMessages([
                    'national_code' => [IdentityVerificationMessages::DUPLICATE_NATIONAL_CODE],
                ]);
            }

            IdentitySubmissionGuard::ensureEditable($profile, $user->id);

            $prompts = config('bahram.identity.video_prompts', []);
            $expectedText = $data['expected_video_text']
                ?? (is_array($prompts) && $prompts !== [] ? $prompts[array_rand($prompts)] : null);

            $draftId = isset($data['draft_submission_id']) ? (int) $data['draft_submission_id'] : 0;

            if ($draftId > 0) {
                $submission = $this->finalizeDraftSubmission(
                    $user,
                    $profile,
                    $data,
                    $nationalCode,
                    $hash,
                    $expectedText,
                    $draftId,
                );
            } else {
                $version = (int) IdentityVerificationSubmission::query()
                    ->where('user_id', $user->id)
                    ->max('version') + 1;

                $submission = IdentityVerificationSubmission::query()->create([
                    'user_id' => $user->id,
                    'identity_profile_id' => $profile->id,
                    'version' => $version,
                    'status' => IdentityVerificationStatus::Submitted,
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'national_code_encrypted' => NationalCode::encrypt($nationalCode),
                    'national_code_hash' => $hash,
                    'date_of_birth' => $data['date_of_birth'],
                    'gender' => $data['gender'],
                    'city' => $data['city'],
                    'expected_video_text' => $expectedText,
                    'provider_route' => 'IDENTITY_MANUAL_REVIEW',
                    'provider_slug' => 'manual-review',
                    'submitted_at' => now(),
                ]);

                $this->attachArtifacts($submission, $profile->uuid, $data);
            }

            $this->assertSubmissionHasArtifacts($submission);

            $profile->fill([
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'national_code_encrypted' => NationalCode::encrypt($nationalCode),
                'national_code_hash' => $hash,
                'date_of_birth' => $data['date_of_birth'],
                'gender' => $data['gender'],
                'city' => $data['city'],
                'identity_status' => IdentityVerificationStatus::Submitted,
            ]);
            $profile->save();

            $submission = $this->applyMobileOwnershipCheck($submission, $user, $profile, $nationalCode);

            if ($submission->status === IdentityVerificationStatus::Rejected) {
                Cache::put($cooldownKey, true, $cooldown);

                $this->purgeStaleDraftSubmissions($user, $submission->id);

                return $submission->load('artifacts');
            }

            Cache::put($cooldownKey, true, $cooldown);

            $this->purgeStaleDraftSubmissions($user, $submission->id);

            return $submission->load('artifacts');
        });

        if ($submission->status === IdentityVerificationStatus::Rejected) {
            if ($submission->mobile_match_status === 'mismatched') {
                $this->dailyLimits->throwMismatch(
                    $user,
                    IdentityVerificationMessages::MOBILE_NATIONAL_MISMATCH,
                );
            }
        }

        if ($submission->status === IdentityVerificationStatus::Submitted) {
            ProcessIdentitySubmissionChecksJob::dispatch($submission->id)->afterResponse();
        }

        return $submission;
    }

    /**
     * PersonInfo inquiry + submitted SMS — deferred so students get a fast submit response.
     *
     * @param  array{first_name: string, last_name: string, date_of_birth: string, gender: string, city: string, expected_video_text?: ?string}  $data
     */
    public function runPostSubmitChecks(
        IdentityVerificationSubmission $submission,
        User $user,
        string $nationalCode,
        array $data,
    ): void {
        $submission = $submission->fresh();
        if (! $submission || $submission->status !== IdentityVerificationStatus::Submitted) {
            return;
        }

        if ($submission->mobile_match_status === 'matched' && $submission->registry_checked_at === null) {
            $submission = $this->applyRegistryLookup($submission, $nationalCode, $data);
        }

        if ($submission->status !== IdentityVerificationStatus::Submitted) {
            return;
        }

        try {
            $this->sms->sendEvent(
                SmsEventKey::IdentityVerificationSubmitted,
                (string) $user->mobile,
                ['{name}' => $user->name ?: $data['first_name']],
                $user->id,
            );
        } catch (Throwable $e) {
            report($e);
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function finalizeDraftSubmission(
        User $user,
        UserIdentityProfile $profile,
        array $data,
        string $nationalCode,
        string $hash,
        ?string $expectedText,
        int $draftId,
    ): IdentityVerificationSubmission {
        $draft = IdentityVerificationSubmission::query()
            ->where('user_id', $user->id)
            ->whereKey($draftId)
            ->whereIn('status', [
                IdentityVerificationStatus::Draft,
                IdentityVerificationStatus::NeedsCorrection,
            ])
            ->lockForUpdate()
            ->first();

        if (! $draft) {
            throw ValidationException::withMessages([
                'draft_submission_id' => [IdentityVerificationMessages::DRAFT_REQUIRED],
            ]);
        }

        $this->attachUploadedFiles($draft, $profile->uuid, $data);

        $draft->update([
            'status' => IdentityVerificationStatus::Submitted,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'national_code_encrypted' => NationalCode::encrypt($nationalCode),
            'national_code_hash' => $hash,
            'date_of_birth' => $data['date_of_birth'],
            'gender' => $data['gender'],
            'city' => $data['city'],
            'expected_video_text' => $expectedText,
            'required_corrections' => null,
            'provider_route' => 'IDENTITY_MANUAL_REVIEW',
            'provider_slug' => 'manual-review',
            'submitted_at' => now(),
            'reviewed_at' => null,
        ]);

        return $draft->fresh();
    }

    private function assertSubmissionHasArtifacts(IdentityVerificationSubmission $submission): void
    {
        $submission->loadMissing('artifacts');

        $card = $submission->artifacts->first(
            fn (IdentityVerificationArtifact $artifact) => $artifact->type === IdentityArtifactType::NationalCardFront,
        );
        $video = $submission->artifacts->first(
            fn (IdentityVerificationArtifact $artifact) => $artifact->type === IdentityArtifactType::SelfieVideo,
        );

        if (! $card || ! $video) {
            throw ValidationException::withMessages([
                'artifacts' => [IdentityVerificationMessages::ARTIFACTS_REQUIRED],
            ]);
        }

        if (! $this->storage->exists($card) || ! $this->storage->exists($video)) {
            throw ValidationException::withMessages([
                'artifacts' => [IdentityVerificationMessages::ARTIFACTS_REQUIRED],
            ]);
        }
    }

    /**
     * Store multipart files directly on an existing submission (draft finalize).
     *
     * @param  array<string, mixed>  $data
     */
    private function attachUploadedFiles(
        IdentityVerificationSubmission $submission,
        string $userUuid,
        array $data,
    ): void {
        foreach ([
            'national_card' => IdentityArtifactType::NationalCardFront,
            'selfie_video' => IdentityArtifactType::SelfieVideo,
        ] as $field => $type) {
            $file = $data[$field] ?? null;
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $stored = $this->storage->storeUploadedFile($file, $userUuid, $submission->uuid, $type->value);
            IdentityVerificationArtifact::query()->updateOrCreate(
                ['submission_id' => $submission->id, 'type' => $type],
                $stored,
            );
        }
    }

    /**
     * @param  array{first_name: string, last_name: string, ...}  $data
     */
    private function applyRegistryLookup(
        IdentityVerificationSubmission $submission,
        string $nationalCode,
        array $data,
    ): IdentityVerificationSubmission {
        $route = IdentityVerificationRoute::query()
            ->where('capability', IdentityCapability::PersonInfoInquiry->value)
            ->first();

        // Missing or inactive PersonInfo route — skip lookup, keep case in expert queue.
        if (! $route || ! $route->is_active) {
            $submission->update([
                'registry_match_status' => null,
                'registry_message' => $route
                    ? 'استعلام مشخصات هویتی (PersonInfo) توسط ادمین موقتاً غیرفعال شده است.'
                    : 'مسیر استعلام مشخصات هویتی (PersonInfo) در تنظیمات تعریف نشده بود — استعلام انجام نشد.',
                'registry_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        $birthDate = JalaliDate::formatApiFromDateString((string) $data['date_of_birth']);

        try {
            $outcome = $this->registry->resolveForCapability(
                IdentityCapability::PersonInfoInquiry,
                fn ($provider) => $provider->lookup($nationalCode, $birthDate),
            );
            $result = $outcome['result'];
            $provider = $outcome['provider'];
            $route = $outcome['route'];
        } catch (Throwable $e) {
            report($e);
            $result = null;
            $provider = null;
            $route = null;
        }

        if ($result) {
            $attemptNumber = (int) IdentityVerificationAttempt::query()
                ->where('user_id', $submission->user_id)
                ->where('capability', IdentityCapability::PersonInfoInquiry)
                ->count() + 1;

            IdentityVerificationAttempt::query()->create([
                'user_id' => $submission->user_id,
                'capability' => IdentityCapability::PersonInfoInquiry,
                'provider' => $provider?->slug() ?? 'api-ir-shahkar',
                'route_id' => $route?->id ? (string) $route->id : null,
                'status' => $result->normalized_result->value,
                'normalized_result' => $result->normalized_result,
                'provider_code' => $result->provider_code,
                'provider_message' => $result->provider_message
                    ? $result->provider_message.' [birthDate='.$birthDate.']'
                    : 'birthDate='.$birthDate,
                'provider_request_id' => $result->provider_request_id,
                'attempt_number' => $attemptNumber,
                'duration_ms' => $result->duration_ms,
                'requested_at' => now(),
                'completed_at' => now(),
            ]);
        }

        // Technical / incomplete PersonInfo: soft-fail into expert queue (same as Shahkar outage).
        if (! $result || $result->isTechnicalFailure()) {
            $submission->update([
                'registry_match_status' => 'unavailable',
                'registry_message' => $result?->provider_message
                    ?: IdentityVerificationMessages::REGISTRY_UNAVAILABLE_ADMIN,
                'registry_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        // Birth-date / registry not found — flag for admin, never block the student.
        if ($result->normalized_result === OwnershipVerificationResult::Mismatched) {
            $submission->update([
                'registry_match_status' => 'mismatched',
                'registry_message' => $result->provider_message
                    ?: IdentityVerificationMessages::REGISTRY_NOT_FOUND,
                'registry_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        if ($result->normalized_result !== OwnershipVerificationResult::Matched || ! $result->hasNames()) {
            $submission->update([
                'registry_match_status' => 'unavailable',
                'registry_message' => $result->provider_message
                    ?: IdentityVerificationMessages::REGISTRY_UNAVAILABLE_ADMIN,
                'registry_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        $namesEqual = PersianName::equal($result->first_name, $data['first_name'])
            && PersianName::equal($result->last_name, $data['last_name']);

        $submission->update([
            'registry_first_name' => $result->first_name,
            'registry_last_name' => $result->last_name,
            'registry_father_name' => $result->father_name,
            'registry_gender' => $result->gender,
            'registry_alive' => $result->alive,
            'registry_match_status' => $namesEqual ? 'matched' : 'mismatched',
            'registry_message' => $namesEqual
                ? null
                : 'نام یا نام‌خانوادگی واردشده با استعلام رسمی مطابقت ندارد.',
            'registry_checked_at' => now(),
        ]);

        return $submission->fresh();
    }

    private function applyMobileOwnershipCheck(
        IdentityVerificationSubmission $submission,
        User $user,
        UserIdentityProfile $profile,
        string $nationalCode,
    ): IdentityVerificationSubmission {
        $mobile = (string) ($user->mobile ?? '');
        if ($mobile === '') {
            $submission->update([
                'mobile_match_status' => 'unavailable',
                'mobile_match_message' => 'شماره موبایل کاربر برای استعلام شاهکار موجود نیست.',
                'mobile_match_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        try {
            $outcome = $this->registry->resolveForCapability(
                IdentityCapability::MobileNationalCodeMatch,
                fn ($provider) => $provider->verify($mobile, $nationalCode),
            );
        } catch (Throwable $e) {
            report($e);
            $submission->update([
                'mobile_match_status' => 'unavailable',
                'mobile_match_message' => 'خطا در استعلام تطبیق موبایل و کد ملی. بررسی دستی لازم است.',
                'mobile_match_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        $result = $outcome['result'];
        $provider = $outcome['provider'];
        $route = $outcome['route'];

        $attemptNumber = (int) IdentityVerificationAttempt::query()
            ->where('user_id', $user->id)
            ->where('capability', IdentityCapability::MobileNationalCodeMatch)
            ->count() + 1;

        IdentityVerificationAttempt::query()->create([
            'user_id' => $user->id,
            'capability' => IdentityCapability::MobileNationalCodeMatch,
            'provider' => $provider->slug(),
            'route_id' => $route?->id ? (string) $route->id : null,
            'status' => $result->normalized_result->value,
            'normalized_result' => $result->normalized_result,
            'provider_code' => $result->provider_code,
            'provider_message' => $result->provider_message,
            'provider_request_id' => $result->provider_request_id,
            'attempt_number' => $attemptNumber,
            'duration_ms' => $result->duration_ms,
            'requested_at' => now(),
            'completed_at' => now(),
        ]);

        if ($result->normalized_result === OwnershipVerificationResult::Matched) {
            $profile->mobile_ownership_status = MobileOwnershipStatus::Verified;
            $profile->mobile_ownership_verified_at = now();
            $profile->mobile_ownership_provider = $provider->slug();
            $profile->ownership_failed_attempts = 0;
            $profile->ownership_locked_at = null;
            $profile->save();
            $profile->syncVerificationLevel();

            $submission->update([
                'mobile_match_status' => 'matched',
                'mobile_match_provider_code' => $result->provider_code,
                'mobile_match_message' => $result->provider_message,
                'mobile_match_checked_at' => now(),
            ]);

            return $submission->fresh();
        }

        if ($result->normalized_result === OwnershipVerificationResult::Mismatched) {
            $profile->mobile_ownership_status = MobileOwnershipStatus::Mismatched;
            $profile->ownership_failed_attempts = (int) $profile->ownership_failed_attempts + 1;
            $profile->identity_status = IdentityVerificationStatus::Rejected;
            $profile->save();
            $profile->syncVerificationLevel();

            $submission->update([
                'status' => IdentityVerificationStatus::Rejected,
                'reviewed_at' => now(),
                'mobile_match_status' => 'mismatched',
                'mobile_match_provider_code' => $result->provider_code,
                'mobile_match_message' => $result->provider_message
                    ?: IdentityVerificationMessages::MOBILE_NATIONAL_MISMATCH,
                'mobile_match_checked_at' => now(),
            ]);

            IdentityVerificationReview::query()->create([
                'submission_id' => $submission->id,
                'reviewer_id' => null,
                'action' => IdentityReviewAction::Reject,
                'reason_code' => IdentityReasonCode::MobileNationalMismatch,
                'reviewer_note' => 'رد خودکار سامانه: شماره موبایل حساب با کد ملی واردشده مطابقت ندارد (شاهکار).',
            ]);

            try {
                $this->notifications->identityRejected($user);
                if ($user->mobile) {
                    $this->sms->sendEvent(
                        SmsEventKey::IdentityVerificationRejected,
                        (string) $user->mobile,
                        ['{name}' => $user->name ?: $submission->first_name],
                        $user->id,
                    );
                }
            } catch (Throwable $e) {
                report($e);
            }

            return $submission->fresh();
        }

        // Technical / provider failures: keep in expert queue and surface details.
        $submission->update([
            'mobile_match_status' => 'unavailable',
            'mobile_match_provider_code' => $result->provider_code,
            'mobile_match_message' => $result->provider_message
                ?: 'استعلام تطبیق موبایل و کد ملی در دسترس نبود. بررسی دستی لازم است.',
            'mobile_match_checked_at' => now(),
        ]);

        return $submission->fresh();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function attachArtifacts(
        IdentityVerificationSubmission $submission,
        string $userUuid,
        array $data,
    ): void {
        foreach ([
            IdentityArtifactType::NationalCardFront->value => IdentityArtifactType::NationalCardFront,
            IdentityArtifactType::SelfieVideo->value => IdentityArtifactType::SelfieVideo,
        ] as $key => $type) {
            $file = $data[$key === 'national_card_front' ? 'national_card' : 'selfie_video'] ?? null;

            if ($file instanceof UploadedFile) {
                $stored = $this->storage->storeUploadedFile($file, $userUuid, $submission->uuid, $type->value);
                IdentityVerificationArtifact::query()->updateOrCreate(
                    ['submission_id' => $submission->id, 'type' => $type],
                    $stored,
                );

                continue;
            }

            $draftId = $data['draft_submission_id'] ?? null;
            if ($draftId) {
                $draftArtifact = IdentityVerificationArtifact::query()
                    ->whereHas('submission', fn ($q) => $q->where('user_id', $submission->user_id)->whereKey($draftId))
                    ->where('type', $type)
                    ->first();

                if ($draftArtifact) {
                    IdentityVerificationArtifact::query()->create([
                        'submission_id' => $submission->id,
                        'type' => $draftArtifact->type,
                        'disk' => $draftArtifact->disk,
                        'path' => $draftArtifact->path,
                        'mime_type' => $draftArtifact->mime_type,
                        'size_bytes' => $draftArtifact->size_bytes,
                        'original_name' => $draftArtifact->original_name,
                    ]);
                }
            }
        }
    }

    /** Drop abandoned step-1 drafts once a real submission exists for the student. */
    private function purgeStaleDraftSubmissions(User $user, int $keepSubmissionId): void
    {
        $staleDrafts = IdentityVerificationSubmission::query()
            ->where('user_id', $user->id)
            ->where('status', IdentityVerificationStatus::Draft)
            ->where('id', '!=', $keepSubmissionId)
            ->with('artifacts')
            ->get();

        foreach ($staleDrafts as $draft) {
            foreach ($draft->artifacts as $artifact) {
                $this->storage->delete($artifact);
                $artifact->delete();
            }
            $draft->delete();
        }
    }
}
