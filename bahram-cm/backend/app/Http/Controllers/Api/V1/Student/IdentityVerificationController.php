<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\IdentitySubmissionGuard;
use App\Actions\Identity\SubmitIdentityVerification;
use App\Enums\IdentityArtifactType;
use App\Enums\IdentityVerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\IdentityVerificationArtifact;
use App\Models\IdentityVerificationSubmission;
use App\Models\UserIdentityProfile;
use App\Services\Identity\IdentityArtifactStorage;
use App\Support\ApiResponse;
use App\Support\IdentityVerificationMessages;
use App\Support\NationalCode;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class IdentityVerificationController extends Controller
{
    public function show(Request $request, EnsureIdentityProfile $ensure): JsonResponse
    {
        $user = $request->user();
        $profile = $ensure($user);
        $latest = IdentityVerificationSubmission::query()
            ->where('user_id', $user->id)
            ->with('artifacts')
            ->orderByDesc('version')
            ->first();

        return ApiResponse::success([
            'verification_level' => $profile->verification_level,
            'identity_status' => $profile->identity_status->value,
            'identity_status_label' => $this->statusLabel($profile->identity_status),
            'mobile_ownership_status' => $profile->mobile_ownership_status->value,
            'first_name' => $profile->first_name,
            'last_name' => $profile->last_name,
            'national_code_masked' => $profile->maskNationalCode(),
            'date_of_birth' => $profile->date_of_birth?->toDateString(),
            'gender' => $profile->gender,
            'city' => $profile->city,
            'required_corrections' => $latest?->required_corrections,
            'latest_submission' => $latest ? $this->submissionPayload($latest) : null,
            'can_submit' => $this->canSubmit($profile, $user->id),
        ]);
    }

    public function draft(Request $request, EnsureIdentityProfile $ensure): JsonResponse
    {
        $data = $request->validate(
            [
                'first_name' => ['required', 'string', 'max:100'],
                'last_name' => ['required', 'string', 'max:100'],
                'national_code' => ['required', 'string', 'max:20'],
                'date_of_birth' => ['required', 'date'],
                'gender' => ['required', 'string', 'max:20'],
                'city' => ['required', 'string', 'max:100'],
            ],
            IdentityVerificationMessages::draftValidationMessages(),
        );

        $nationalCode = NationalCode::normalize($data['national_code']);
        if (! NationalCode::isValid($nationalCode)) {
            return ApiResponse::error('invalid_national_code', IdentityVerificationMessages::INVALID_NATIONAL_CODE, 422);
        }

        $hash = NationalCode::hash($nationalCode);

        $user = $request->user();

        $duplicate = UserIdentityProfile::query()
            ->where('national_code_hash', $hash)
            ->where('user_id', '!=', $user->id)
            ->exists();

        if ($duplicate) {
            return ApiResponse::error('duplicate_national_code', IdentityVerificationMessages::DUPLICATE_NATIONAL_CODE, 422);
        }

        try {
            $submission = DB::transaction(function () use ($user, $ensure, $data, $nationalCode) {
                $profile = $ensure($user);
                /** @var UserIdentityProfile $profile */
                $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

                IdentitySubmissionGuard::ensureEditable($profile, $user->id);

                $draft = IdentityVerificationSubmission::query()
                    ->where('user_id', $user->id)
                    ->where('status', IdentityVerificationStatus::Draft)
                    ->orderByDesc('id')
                    ->first();

                $payload = [
                    'user_id' => $user->id,
                    'identity_profile_id' => $profile->id,
                    'version' => $draft?->version ?? ((int) IdentityVerificationSubmission::query()->where('user_id', $user->id)->max('version') + 1),
                    'status' => IdentityVerificationStatus::Draft,
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'national_code_encrypted' => NationalCode::encrypt($nationalCode),
                    'national_code_hash' => NationalCode::hash($nationalCode),
                    'date_of_birth' => $data['date_of_birth'],
                    'gender' => $data['gender'],
                    'city' => $data['city'],
                ];

                if ($draft) {
                    $draft->update($payload);
                    $submission = $draft->fresh();
                } else {
                    $submission = IdentityVerificationSubmission::query()->create($payload);
                }

                $profile->fill([
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'national_code_encrypted' => NationalCode::encrypt($nationalCode),
                    'national_code_hash' => NationalCode::hash($nationalCode),
                    'date_of_birth' => $data['date_of_birth'],
                    'gender' => $data['gender'],
                    'city' => $data['city'],
                    'identity_status' => IdentityVerificationStatus::Draft,
                ])->save();

                return $submission;
            });
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: IdentityVerificationMessages::STATUS_LOCKED;

            return ApiResponse::error('status_locked', $message, 422, $e->errors());
        } catch (UniqueConstraintViolationException) {
            return ApiResponse::error('duplicate_national_code', IdentityVerificationMessages::DUPLICATE_NATIONAL_CODE, 422);
        }

        return ApiResponse::success($this->submissionPayload($submission));
    }

    public function uploadArtifact(
        Request $request,
        EnsureIdentityProfile $ensure,
        IdentityArtifactStorage $storage,
    ): JsonResponse {
        $data = $request->validate(
            [
                'type' => ['required', 'string', 'in:national_card_front,selfie_video'],
                'file' => ['required', 'file'],
                'submission_id' => ['nullable', 'integer'],
            ],
            IdentityVerificationMessages::uploadValidationMessages(),
        );

        $type = IdentityArtifactType::from($data['type']);
        $maxKb = $type === IdentityArtifactType::SelfieVideo
            ? (int) config('bahram.identity.selfie_max_mb', 25) * 1024
            : (int) config('bahram.identity.national_card_max_mb', 8) * 1024;

        $mimeRules = $type === IdentityArtifactType::SelfieVideo
            ? ['mimes:mp4,webm,mov,quicktime']
            : ['mimes:jpg,jpeg,png,webp'];

        $request->validate(
            ['file' => array_merge($mimeRules, ["max:{$maxKb}"])],
            [
                'file.max' => $type === IdentityArtifactType::SelfieVideo
                    ? IdentityVerificationMessages::VIDEO_FILE_TOO_LARGE
                    : IdentityVerificationMessages::CARD_FILE_TOO_LARGE,
            ],
        );

        $user = $request->user();
        $profile = $ensure($user);

        if (IdentitySubmissionGuard::isLocked($profile, $user->id)) {
            return ApiResponse::error('status_locked', IdentityVerificationMessages::STATUS_LOCKED, 422);
        }

        $submission = IdentityVerificationSubmission::query()
            ->where('user_id', $user->id)
            ->when(
                $data['submission_id'] ?? null,
                fn ($q, $id) => $q->whereKey($id),
                fn ($q) => $q->where('status', IdentityVerificationStatus::Draft)->orderByDesc('id'),
            )
            ->first();

        if (! $submission) {
            return ApiResponse::error('draft_required', IdentityVerificationMessages::DRAFT_REQUIRED, 422);
        }

        $stored = $storage->storeUploadedFile(
            $request->file('file'),
            $profile->uuid,
            $submission->uuid,
            $type->value,
        );

        $artifact = IdentityVerificationArtifact::query()->updateOrCreate(
            ['submission_id' => $submission->id, 'type' => $type],
            $stored,
        );

        return ApiResponse::success([
            'id' => $artifact->id,
            'uuid' => $artifact->uuid,
            'type' => $artifact->type->value,
            'mime_type' => $artifact->mime_type,
            'size_bytes' => $artifact->size_bytes,
        ], 201);
    }

    public function videoPrompt(Request $request): JsonResponse
    {
        $prompts = config('bahram.identity.video_prompts', []);
        $text = is_array($prompts) && $prompts !== []
            ? $prompts[array_rand($prompts)]
            : 'من درخواست تأیید حسابم را دارم.';

        return ApiResponse::success([
            'text' => $text,
            'min_seconds' => (int) config('bahram.identity.selfie_min_seconds', 5),
            'max_seconds' => (int) config('bahram.identity.selfie_max_seconds', 20),
        ]);
    }

    public function submit(Request $request, SubmitIdentityVerification $submit): JsonResponse
    {
        $data = $request->validate(
            [
                'first_name' => ['required', 'string', 'max:100'],
                'last_name' => ['required', 'string', 'max:100'],
                'national_code' => ['required', 'string', 'max:20'],
                'date_of_birth' => ['required', 'date'],
                'gender' => ['required', 'string', 'max:20'],
                'city' => ['required', 'string', 'max:100'],
                'expected_video_text' => ['nullable', 'string', 'max:500'],
                'draft_submission_id' => ['nullable', 'integer'],
                'national_card' => ['nullable', 'file'],
                'selfie_video' => ['nullable', 'file'],
            ],
            IdentityVerificationMessages::submitValidationMessages(),
        );

        try {
            $submission = $submit($request->user(), $data);
        } catch (ValidationException $e) {
            $errors = $e->errors();

            if (isset($errors['status'])) {
                return ApiResponse::error('status_locked', IdentityVerificationMessages::STATUS_LOCKED, 422, $errors);
            }

            if (isset($errors['cooldown'])) {
                $message = $errors['cooldown'][0] ?? IdentityVerificationMessages::COOLDOWN;

                return ApiResponse::error('cooldown', $message, 422, $errors);
            }

            $message = collect($errors)->flatten()->first() ?: IdentityVerificationMessages::GENERIC_VALIDATION;

            return ApiResponse::error('validation_error', $message, 422, $errors);
        }

        return ApiResponse::success($this->submissionPayload($submission), 201);
    }

    /** @return array<string, mixed> */
    private function submissionPayload(IdentityVerificationSubmission $submission): array
    {
        return [
            'id' => $submission->id,
            'uuid' => $submission->uuid,
            'version' => $submission->version,
            'status' => $submission->status->value,
            'status_label' => $this->statusLabel($submission->status),
            'first_name' => $submission->first_name,
            'last_name' => $submission->last_name,
            'date_of_birth' => $submission->date_of_birth?->toDateString(),
            'gender' => $submission->gender,
            'city' => $submission->city,
            'expected_video_text' => $submission->expected_video_text,
            'required_corrections' => $submission->required_corrections,
            'submitted_at' => $submission->submitted_at?->toIso8601String(),
            'artifacts' => $submission->relationLoaded('artifacts')
                ? $submission->artifacts->map(fn (IdentityVerificationArtifact $a) => [
                    'type' => $a->type->value,
                    'mime_type' => $a->mime_type,
                    'size_bytes' => $a->size_bytes,
                ])->values()->all()
                : [],
        ];
    }

    private function canSubmit(UserIdentityProfile $profile, int $userId): bool
    {
        if (IdentitySubmissionGuard::isLocked($profile, $userId)) {
            return false;
        }

        return in_array($profile->identity_status, [
            IdentityVerificationStatus::NotStarted,
            IdentityVerificationStatus::Draft,
            IdentityVerificationStatus::NeedsCorrection,
            IdentityVerificationStatus::Rejected,
        ], true);
    }

    private function statusLabel(IdentityVerificationStatus $status): string
    {
        return match ($status) {
            IdentityVerificationStatus::NotStarted => 'شروع نشده',
            IdentityVerificationStatus::Draft => 'پیش‌نویس',
            IdentityVerificationStatus::Submitted => 'در صف بررسی',
            IdentityVerificationStatus::UnderReview => 'در حال بررسی',
            IdentityVerificationStatus::NeedsCorrection => 'نیاز به اصلاح',
            IdentityVerificationStatus::Approved => 'تأیید شده',
            IdentityVerificationStatus::Rejected => 'رد شده',
        };
    }
}
