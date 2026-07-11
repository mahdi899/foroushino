<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Actions\Identity\ApproveIdentityVerification;
use App\Actions\Identity\OverrideVerificationLevel;
use App\Actions\Identity\RejectIdentityVerification;
use App\Actions\Identity\RequestIdentityCorrection;
use App\Actions\Identity\UnlockMobileOwnershipVerification;
use App\Enums\IdentityReasonCode;
use App\Enums\IdentityVerificationStatus;
use App\Http\Controllers\Controller;
use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Models\UserIdentityProfile;
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

        $query = IdentityVerificationSubmission::query()
            ->with(['user:id,name,mobile', 'identityProfile'])
            ->orderByDesc('submitted_at')
            ->orderByDesc('id');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        } else {
            $query->whereIn('status', [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ]);
        }

        if ($request->boolean('ownership_locked')) {
            $query->whereHas(
                'identityProfile',
                fn ($q) => $q->where('mobile_ownership_status', 'locked'),
            );
        }

        if ($search = $request->string('search')->trim()->toString()) {
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('city', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }

        $perPage = min(max((int) $request->input('per_page', 30), 1), 100);
        $page = $query->paginate($perPage);

        return response()->json([
            'data' => $page->getCollection()->map(fn (IdentityVerificationSubmission $s) => $this->listPayload($s)),
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

        if ($submission->status === IdentityVerificationStatus::Submitted
            && $request->user()->hasPermission('identity.review')) {
            $submission->update(['status' => IdentityVerificationStatus::UnderReview]);
            $submission->identityProfile?->update([
                'identity_status' => IdentityVerificationStatus::UnderReview,
            ]);
            $submission->refresh();
        }

        $national = NationalCode::decrypt($submission->national_code_encrypted);

        return response()->json(['data' => [
            ...$this->listPayload($submission),
            'date_of_birth' => $submission->date_of_birth?->toDateString(),
            'gender' => $submission->gender,
            'city' => $submission->city,
            'national_code_masked' => NationalCode::mask($national),
            'expected_video_text' => $submission->expected_video_text,
            'required_corrections' => $submission->required_corrections,
            'artifacts' => $submission->artifacts->map(fn ($a) => [
                'id' => $a->id,
                'uuid' => $a->uuid,
                'type' => $a->type->value,
                'mime_type' => $a->mime_type,
                'size_bytes' => $a->size_bytes,
                'original_name' => $a->original_name,
            ]),
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
                'mobile_masked' => SensitiveData::maskMobile($submission->user?->mobile),
            ],
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

        return response()->json(['data' => $this->listPayload($result)]);
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

        return response()->json(['data' => $this->listPayload($result)]);
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

        return response()->json(['data' => $this->listPayload($result)]);
    }

    public function next(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasPermission('identity.review'), 403);

        $afterId = $request->integer('after_id');

        $next = IdentityVerificationSubmission::query()
            ->whereIn('status', [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ])
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
        abort_if($student->is_admin, 404);

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
        abort_if($student->is_admin, 404);

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

    /** @return array<string, int> */
    private function dashboardStats(): array
    {
        $counts = IdentityVerificationSubmission::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $submitted = (int) ($counts->get(IdentityVerificationStatus::Submitted->value) ?? 0);
        $underReview = (int) ($counts->get(IdentityVerificationStatus::UnderReview->value) ?? 0);
        $queueTotal = UserIdentityProfile::query()
            ->whereIn('identity_status', [
                IdentityVerificationStatus::Submitted,
                IdentityVerificationStatus::UnderReview,
            ])
            ->count();

        return [
            'pending_review' => max($queueTotal, $submitted + $underReview),
            'submitted' => $submitted,
            'under_review' => $underReview,
            'needs_correction' => (int) ($counts->get(IdentityVerificationStatus::NeedsCorrection->value) ?? 0),
            'approved' => (int) ($counts->get(IdentityVerificationStatus::Approved->value) ?? 0),
            'rejected' => (int) ($counts->get(IdentityVerificationStatus::Rejected->value) ?? 0),
            'queue_total' => $queueTotal,
            'ownership_locked' => UserIdentityProfile::query()
                ->where('mobile_ownership_status', 'locked')
                ->count(),
        ];
    }

    /** @return array<string, mixed> */
    private function listPayload(IdentityVerificationSubmission $s): array
    {
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
            'mobile_masked' => SensitiveData::maskMobile($s->user?->mobile),
            'user_mobile_masked' => SensitiveData::maskMobile($s->user?->mobile),
            'ownership_locked' => $s->identityProfile?->mobile_ownership_status?->value === 'locked',
        ];
    }
}
