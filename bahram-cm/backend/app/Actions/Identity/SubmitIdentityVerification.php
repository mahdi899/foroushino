<?php

namespace App\Actions\Identity;

use App\Enums\IdentityArtifactType;
use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\SmsEventKey;
use App\Models\IdentityVerificationArtifact;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\IdentityArtifactStorage;
use App\Services\Identity\IdentityDailyLimitService;
use App\Services\Identity\IdentityVerificationProviderRegistry;
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

            $version = (int) IdentityVerificationSubmission::query()
                ->where('user_id', $user->id)
                ->max('version') + 1;

            $prompts = config('bahram.identity.video_prompts', []);
            $expectedText = $data['expected_video_text']
                ?? (is_array($prompts) && $prompts !== [] ? $prompts[array_rand($prompts)] : null);

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

            $hasCard = $submission->artifacts()->where('type', IdentityArtifactType::NationalCardFront)->exists();
            $hasVideo = $submission->artifacts()->where('type', IdentityArtifactType::SelfieVideo)->exists();

            if (! $hasCard || ! $hasVideo) {
                throw ValidationException::withMessages([
                    'artifacts' => [IdentityVerificationMessages::ARTIFACTS_REQUIRED],
                ]);
            }

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

            $submission = $this->applyRegistryLookup($submission, $nationalCode, $data);

            if ($submission->registry_match_status === 'mismatched') {
                $submission->update(['status' => IdentityVerificationStatus::NeedsCorrection]);
                $profile->forceFill([
                    'identity_status' => IdentityVerificationStatus::NeedsCorrection,
                ])->save();
            }

            Cache::put($cooldownKey, true, $cooldown);

            if ($submission->registry_match_status !== 'mismatched') {
                try {
                    $this->sms->sendEvent(
                        SmsEventKey::IdentityVerificationSubmitted,
                        (string) $user->mobile,
                        ['{name}' => $user->name ?: $data['first_name']],
                        $user->id,
                    );
                } catch (\Throwable $e) {
                    report($e);
                }
            }

            // Always wait for expert review — no auto-approve on PersonInfo match.

            return $submission->load('artifacts');
        });

        if ($submission->registry_match_status === 'mismatched') {
            $this->dailyLimits->throwMismatch($user);
        }

        return $submission;
    }

    /**
     * @param  array{first_name: string, last_name: string, ...}  $data
     */
    private function applyRegistryLookup(
        IdentityVerificationSubmission $submission,
        string $nationalCode,
        array $data,
    ): IdentityVerificationSubmission {
        $birthDate = JalaliDate::formatApi(\Illuminate\Support\Carbon::parse($data['date_of_birth']));

        try {
            $outcome = $this->registry->resolveForCapability(
                IdentityCapability::PersonInfoInquiry,
                fn ($provider) => $provider->lookup($nationalCode, $birthDate),
            );
            $result = $outcome['result'];
        } catch (Throwable) {
            $result = null;
        }

        if (! $result || $result->isTechnicalFailure()) {
            $submission->update(['registry_match_status' => 'unavailable', 'registry_checked_at' => now()]);

            return $submission->fresh();
        }

        if ($result->normalized_result !== OwnershipVerificationResult::Matched || ! $result->hasNames()) {
            $submission->update(['registry_match_status' => 'unavailable', 'registry_checked_at' => now()]);

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
            'registry_checked_at' => now(),
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
                        'type' => $type,
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
}
