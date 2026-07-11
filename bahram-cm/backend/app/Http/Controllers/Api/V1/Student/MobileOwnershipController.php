<?php

namespace App\Http\Controllers\Api\V1\Student;

use App\Actions\Identity\EnsureIdentityProfile;
use App\Actions\Identity\VerifyMobileOwnership;
use App\Enums\MobileOwnershipStatus;
use App\Enums\OwnershipVerificationResult;
use App\Http\Controllers\Controller;
use App\Support\ApiResponse;
use App\Support\MobileClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MobileOwnershipController extends Controller
{
    public function show(Request $request, EnsureIdentityProfile $ensure): JsonResponse
    {
        $profile = $ensure($request->user());

        return ApiResponse::success([
            'status' => $profile->mobile_ownership_status->value,
            'status_label' => $this->statusLabel($profile->mobile_ownership_status),
            'failed_attempts' => $profile->ownership_failed_attempts,
            'max_attempts' => (int) config('bahram.identity.ownership_max_attempts', 3),
            'locked_at' => $profile->ownership_locked_at?->toIso8601String(),
            'verified_at' => $profile->mobile_ownership_verified_at?->toIso8601String(),
            'verification_level' => $profile->verification_level,
            'requires_phone' => true,
            'is_phone_client' => MobileClient::isPhone($request->userAgent()),
        ]);
    }

    public function verify(Request $request, VerifyMobileOwnership $verify): JsonResponse
    {
        if ($deny = MobileClient::denyUnlessPhone($request)) {
            return $deny;
        }

        try {
            $outcome = $verify($request->user());
        } catch (ValidationException $e) {
            $message = collect($e->errors())->flatten()->first() ?: 'امکان تطبیق وجود ندارد.';
            $code = str_contains((string) $message, 'قفل') ? 'ownership_locked' : 'ownership_verify_failed';

            return ApiResponse::error($code, $message, 422, $e->errors());
        }

        $result = $outcome['result'];
        $profile = $outcome['profile'];

        $message = match ($result) {
            OwnershipVerificationResult::Matched => 'تطبیق شماره با موفقیت انجام شد.',
            OwnershipVerificationResult::Mismatched => 'شماره موبایل با کد ملی مطابقت ندارد.',
            OwnershipVerificationResult::RateLimited => 'تعداد درخواست‌ها بیش از حد است. کمی بعد تلاش کنید.',
            OwnershipVerificationResult::Unauthorized,
            OwnershipVerificationResult::TechnicalError,
            OwnershipVerificationResult::ProviderError => 'سرویس تطبیق موقتاً در دسترس نیست. بعداً تلاش کنید.',
            default => 'نتیجه تطبیق نامشخص است.',
        };

        return ApiResponse::success([
            'result' => $result->value,
            'message' => $message,
            'status' => $profile->mobile_ownership_status->value,
            'verification_level' => $profile->verification_level,
            'failed_attempts' => $profile->ownership_failed_attempts,
            'used_fallback' => $outcome['used_fallback'],
        ]);
    }

    private function statusLabel(MobileOwnershipStatus $status): string
    {
        return match ($status) {
            MobileOwnershipStatus::NotStarted => 'شروع نشده',
            MobileOwnershipStatus::Pending => 'در انتظار',
            MobileOwnershipStatus::Verified => 'تأیید شده',
            MobileOwnershipStatus::Mismatched => 'عدم تطابق',
            MobileOwnershipStatus::Locked => 'قفل شده',
        };
    }
}
