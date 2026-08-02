<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\OverrideVerificationLevel;
use App\Actions\Identity\RejectIdentityVerification;
use App\Actions\Identity\RequestIdentityCorrection;
use App\Actions\Identity\ResetIdentityVerification;
use App\Actions\Identity\UnlockMobileOwnershipVerification;
use App\Enums\IdentityReasonCode;
use App\Enums\IdentityVerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\IdentityArtifactStorage;
use Illuminate\Contracts\Auth\Authenticatable;
use App\Support\Mobile;
use App\Support\NationalCode;
use App\Support\SensitiveData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class IdentityVerificationAdminController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity.view'), 403);

        return response()->json(['data' => $this->dashboardStats()]);
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity.view'), 403);

        $status = $request->string('status')->toString();
        $search = $request->string('search')->trim()->toString();
        // When searching without an explicit status filter, include the latest submission per user
        // regardless of queue status so approved/rejected records remain discoverable.
        $statusForSubquery = $status !== '' ? $status : ($search !== '' ? 'all' : null);

        $query = IdentityVerificationSubmission::query()
            ->with(['user:id,name,mobile', 'identityProfile'])
            ->whereIn('id', $this->latestSubmissionIdsSubquery($statusForSubquery))
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');

        if ($request->boolean('ownership_locked')) {
            $query->whereHas(
                'identityProfile',
                fn ($q) => $q->where('mobile_ownership_status', 'locked'),
            );
        }

        if ($search !== '') {
            $normalizedMobile = Mobile::normalize($search);

            $query->where(function ($q) use ($search, $normalizedMobile) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($u) use ($search, $normalizedMobile) {
                        $u->where('name', 'like', "%{$search}%");

                        if ($normalizedMobile) {
                            $u->orWhere('mobile', $normalizedMobile);
                        } else {
                            $u->orWhere('mobile', 'like', "%{$search}%");
                        }
                    });
            });
        }

        $perPage = min(max((int) $request->input('per_page', 30), 1), 100);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->getCollection()->map(fn (IdentityVerificationSubmission $s) => $this->listPayload($s, $request->user())),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
            'stats' => $this->dashboardStats(),
        ]);
    }

    public function show(Request $request, IdentityVerificationSubmission $submission): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity.view'), 403);

        $submission->load(['artifacts', 'reviews.reviewer:id,name', 'user:id,name,mobile', 'identityProfile']);
        $artifactStorage = app(IdentityArtifactStorage::class);
        $artifactsMissing = ! $artifactStorage->submissionArtifactsAvailable($submission);

        if ($submission->status === IdentityVerificationStatus::Submitted
            && $request->user()->hasPermission('identity.review')) {
            $submission->update(['status' => IdentityVerificationStatus::UnderReview]);
            $submission->identityProfile?->update([
                'identity_status' => IdentityVerificationStatus::UnderReview,
            ]);
            $submission->refresh();
        }

        return response()->json(['data' => [
            ...$this->listPayload($submission, $request->user()),
            'date_of_birth' => $submission->date_of_birth?->toDateString(),
            'gender' => $submission->gender,
            'city' => $submission->city,
            'expected_video_text' => $submission->expected_video_text,
            'required_corrections' => $submission->required_corrections,
            'registry' => [
                'match_status' => $submission->registry_match_status,
                'first_name' => $submission->registry_first_name,
                'last_name' => $submission->registry_last_name,
                'father_name' => $submission->registry_father_name,
                'gender' => $submission->registry_gender,
                'alive' => $submission->registry_alive,
                'message' => $submission->registry_message,
                'checked_at' => $submission->registry_checked_at?->toIso8601String(),
            ],
            'mobile_match' => [
                'match_status' => $submission->mobile_match_status,
                'provider_code' => $submission->mobile_match_provider_code,
                'message' => $submission->mobile_match_message,
                'checked_at' => $submission->mobile_match_checked_at?->toIso8601String(),
            ],
            'artifacts' => $submission->artifacts->map(fn ($a) => [
                'id' => $a->id,
                'uuid' => $a->uuid,
                'type' => $a->type->value,
                'mime_type' => $a->mime_type,
                'size_bytes' => $a->size_bytes,
                'original_name' => $a->original_name,
                'file_exists' => $artifactStorage->exists($a),
            ]),
            'artifacts_missing' => $artifactsMissing,
            'artifacts_purged' => $submission->status === IdentityVerificationStatus::Approved
                && $submission->artifacts->isEmpty(),
            'reviews' => $submission->reviews->map(fn ($r) => [
                'id' => $r->id,
                'action' => $r->action->value,
                'reason_code' => $r->reason_code?->value,
                'reviewer_note' => $r->reviewer_note,
                'correction_items' => $r->correction_items,
                'reviewer_name' => $r->reviewer?->name,
                'created_at' => $r->created_at?->toIso8601String(),
            ]),
            'profile' => $submission->identityProfile ? [
                'verification_level' => $submission->identityProfile->verification_level,
                'identity_status' => $submission->identityProfile->identity_status->value,
                'mobile_ownership_status' => $submission->identityProfile->mobile_ownership_status->value,
                'ownership_failed_attempts' => $submission->identityProfile->ownership_failed_attempts,
                'ownership_locked_at' => $submission->identityProfile->ownership_locked_at?->toIso8601String(),
            ] : null,
            'user' => [
                'id' => $submission->user?->id,
                'name' => $submission->user?->name,
                'mobile' => $this->canViewFullMobileInIdentity($request->user())
                    ? $submission->user?->mobile
                    : null,
                'mobile_masked' => SensitiveData::maskMobile($submission->user?->mobile),
            ],
            'can_reveal_national_code' => $this->canViewFullNationalCodeInIdentity($request->user()),
            'can_reveal_mobile' => $this->canViewFullMobileInIdentity($request->user()),
            'can_approve' => $request->user()->hasPermission('identity.approve'),
            'can_reject' => $request->user()->hasPermission('identity.reject'),
            'can_request_correction' => $request->user()->hasPermission('identity.request_correction'),
            'can_view_documents' => $request->user()->hasPermission('identity.view_sensitive_documents'),
        ]]);
    }

    public function approve(
        Request $request,
        IdentityVerificationSubmission $submission,
        ApproveIdentityVerification $approve,
    ): JsonResponse {
        abort_unless($request->user()->hasPermission('identity.approve'), 403);

        $data = $request->validate(['note' => ['nullable', 'string', 'max:2000']]);

        try {
            $result = $approve($request->user(), $submission, $data['note'] ?? null);
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first(), 'errors' => $e->errors()], 422);
        }

        return response()->json(['data' => $this->listPayload($result, $request->user())]);
    }

    public function reject(
        Request $request,
        IdentityVerificationSubmission $submission,
        RejectIdentityVerification $reject,
    ): JsonResponse {
        abort_unless($request->user()->hasPermission('identity.reject'), 403);

        $data = $request->validate([
            'reason_code' => ['nullable', 'string'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $reason = isset($data['reason_code']) ? IdentityReasonCode::tryFrom($data['reason_code']) : null;

        try {
            $result = $reject($request->user(), $submission, $reason, $data['note'] ?? null);
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first(), 'errors' => $e->errors()], 422);
        }

        return response()->json(['data' => $this->listPayload($result, $request->user())]);
    }

    public function requestCorrection(
        Request $request,
        IdentityVerificationSubmission $submission,
        RequestIdentityCorrection $action,
    ): JsonResponse {
        abort_unless($request->user()->hasPermission('identity.request_correction'), 403);

        $data = $request->validate([
            'correction_items' => ['required', 'array', 'min:1'],
            'correction_items.*' => ['string', 'max:255'],
            'reason_code' => ['nullable', 'string'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        $reason = isset($data['reason_code']) ? IdentityReasonCode::tryFrom($data['reason_code']) : null;

        try {
            $result = $action(
                $request->user(),
                $submission,
                $data['correction_items'],
                $reason,
                $data['note'] ?? null,
            );
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first(), 'errors' => $e->errors()], 422);
        }

        return response()->json(['data' => $this->listPayload($result, $request->user())]);
    }

    public function next(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity.review'), 403);

        $afterId = $request->integer('after_id');

        $next = IdentityVerificationSubmission::query()
            ->whereIn('id', $this->latestSubmissionIdsSubquery())
            ->when($afterId, fn ($q) => $q->where('id', '>', $afterId))
            ->orderBy('submitted_at')
            ->orderBy('id')
            ->first();

        if (! $next) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => ['id' => $next->id]]);
    }

    public function unlockOwnership(
        Request $request,
        User $student,
        UnlockMobileOwnershipVerification $unlock,
    ): JsonResponse {
        abort_unless($request->user()->hasPermission('identity.unlock_ownership_verification'), 403);
        abort_if($student->isIdentityManagementProtected(), 404);

        $profile = $unlock($request->user(), $student);

        return response()->json(['data' => [
            'student_id' => $student->id,
            'mobile_ownership_status' => $profile->mobile_ownership_status->value,
            'ownership_failed_attempts' => $profile->ownership_failed_attempts,
        ]]);
    }

    public function overrideLevel(
        Request $request,
        User $student,
        OverrideVerificationLevel $override,
    ): JsonResponse {
        abort_unless($request->user()->hasPermission('identity.override_level'), 403);
        abort_if($student->isIdentityManagementProtected(), 404);

        $data = $request->validate([
            'level' => ['required', 'integer', 'in:1,2,3'],
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        try {
            $profile = $override($request->user(), $student, (int) $data['level'], $data['reason']);
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first(), 'errors' => $e->errors()], 422);
        }

        return response()->json(['data' => [
            'student_id' => $student->id,
            'verification_level' => $profile->verification_level,
            'identity_status' => $profile->identity_status->value,
            'mobile_ownership_status' => $profile->mobile_ownership_status->value,
        ]]);
    }

    public function history(Request $request, User $student): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity.view'), 403);
        abort_if($student->isIdentityManagementProtected(), 404);

        $submissions = IdentityVerificationSubmission::query()
            ->where('user_id', $student->id)
            ->where('status', '!=', IdentityVerificationStatus::Draft)
            ->withCount('reviews')
            ->orderByDesc('version')
            ->orderByDesc('id')
            ->get()
            ->map(fn (IdentityVerificationSubmission $s) => [
                ...$this->listPayload($s, $request->user()),
                'reviews_count' => $s->reviews_count,
            ]);

        return response()->json(['data' => $submissions]);
    }

    public function resetIdentity(
        Request $request,
        User $student,
        ResetIdentityVerification $reset,
    ): JsonResponse {
        abort_unless($request->user()->hasPermission('identity.reset'), 403);
        abort_if($student->isIdentityManagementProtected(), 404);

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:2000'],
        ]);

        try {
            $profile = $reset($request->user(), $student, $data['reason']);
        } catch (ValidationException $e) {
            return response()->json(['message' => collect($e->errors())->flatten()->first(), 'errors' => $e->errors()], 422);
        }

        return response()->json(['data' => [
            'student_id' => $student->id,
            'verification_level' => $profile->verification_level,
            'identity_status' => $profile->identity_status->value,
            'mobile_ownership_status' => $profile->mobile_ownership_status->value,
        ]]);
    }

    /** @return array<string, int> */
    private function dashboardStats(): array
    {
        $queueSubmissionIds = $this->latestSubmissionIdsSubquery();
        $queueRows = IdentityVerificationSubmission::query()
            ->whereIn('id', $queueSubmissionIds)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $submitted = (int) ($queueRows->get(IdentityVerificationStatus::Submitted->value) ?? 0);
        $underReview = (int) ($queueRows->get(IdentityVerificationStatus::UnderReview->value) ?? 0);
        $queueTotal = UserIdentityProfile::query()
            ->whereIn('identity_status', [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ])
            ->count();

        $allCounts = IdentityVerificationSubmission::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return [
            'pending_review' => max($queueTotal, $submitted + $underReview),
            'submitted' => $submitted,
            'under_review' => $underReview,
            'needs_correction' => (int) ($allCounts->get(IdentityVerificationStatus::NeedsCorrection->value) ?? 0),
            'approved' => (int) ($allCounts->get(IdentityVerificationStatus::Approved->value) ?? 0),
            'rejected' => (int) ($allCounts->get(IdentityVerificationStatus::Rejected->value) ?? 0),
            'queue_total' => $queueTotal,
            'ownership_locked' => UserIdentityProfile::query()
                ->where('mobile_ownership_status', 'locked')
                ->count(),
        ];
    }

    /** Latest submission row per student for the active admin queue/filter. */
    private function latestSubmissionIdsSubquery(?string $status = null): \Illuminate\Database\Eloquent\Builder
    {
        return IdentityVerificationSubmission::query()
            ->selectRaw('max(id) as id')
            ->when(
                $status === 'all',
                fn ($q) => $q,
                fn ($q) => $q->when(
                    $status,
                    fn ($inner) => $inner->where('status', $status),
                    fn ($inner) => $inner->whereIn('status', [
                        IdentityVerificationStatus::Submitted,
                        IdentityVerificationStatus::UnderReview,
                    ]),
                ),
            )
            ->groupBy('user_id');
    }

    /** @return array<string, mixed> */
    private function listPayload(IdentityVerificationSubmission $s, ?Authenticatable $actor = null): array
    {
        $mobile = $s->user?->mobile;
        $national = NationalCode::decrypt($s->national_code_encrypted);
        $canViewMobile = $actor instanceof User && $this->canViewFullMobileInIdentity($actor);
        $canViewNational = $actor instanceof User && $this->canViewFullNationalCodeInIdentity($actor);

        return [
            'id' => $s->id,
            'uuid' => $s->uuid,
            'user_id' => $s->user_id,
            'version' => $s->version,
            'status' => $s->status->value,
            'first_name' => $s->first_name,
            'last_name' => $s->last_name,
            'city' => $s->city,
            'submitted_at' => $s->submitted_at?->toIso8601String(),
            'reviewed_at' => $s->reviewed_at?->toIso8601String(),
            'user_name' => $s->user?->name,
            'mobile_masked' => SensitiveData::maskMobile($mobile),
            'user_mobile_masked' => SensitiveData::maskMobile($mobile),
            'user_mobile' => $canViewMobile ? $mobile : null,
            'national_code_masked' => NationalCode::mask($national),
            'national_code' => $canViewNational ? $national : null,
            'ownership_locked' => $s->identityProfile?->mobile_ownership_status?->value === 'locked',
            'registry_match_status' => $s->registry_match_status,
            'mobile_match_status' => $s->mobile_match_status,
            'verification_level' => $s->identityProfile?->verification_level,
            'identity_verified_at' => $s->identityProfile?->identity_verified_at?->toIso8601String(),
        ];
    }

    private function canViewFullMobileInIdentity(User $user): bool
    {
        return $user->hasPermission('students.view_full_mobile')
            || $this->hasIdentityReviewAccess($user);
    }

    private function canViewFullNationalCodeInIdentity(User $user): bool
    {
        return $user->hasPermission('identity.view_national_code')
            || $this->hasIdentityReviewAccess($user);
    }

    private function hasIdentityReviewAccess(User $user): bool
    {
        return $user->hasPermission('identity.review')
            || $user->hasPermission('identity.approve')
            || $user->hasPermission('identity.reject')
            || $user->hasPermission('identity.request_correction');
    }
}
