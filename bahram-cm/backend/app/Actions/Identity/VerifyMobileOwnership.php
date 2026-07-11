<?php

namespace App\Actions\Identity;

use App\Enums\IdentityCapability;
use App\Enums\IdentityVerificationStatus;
use App\Enums\MobileOwnershipStatus;
use App\Enums\OwnershipVerificationResult;
use App\Enums\SmsEventKey;
use App\Models\IdentityVerificationAttempt;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\Identity\IdentityVerificationProviderRegistry;
use App\Services\SmsService;
use App\Support\NationalCode;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerifyMobileOwnership
{
    public function __construct(
        private readonly EnsureIdentityProfile $ensureProfile,
        private readonly IdentityVerificationProviderRegistry $registry,
        private readonly LockMobileOwnershipVerification $lock,
        private readonly SmsService $sms,
    ) {}

    /**
     * @return array{profile: UserIdentityProfile, result: OwnershipVerificationResult, attempt: IdentityVerificationAttempt, used_fallback: bool}
     */
    public function __invoke(User $user): array
    {
        return DB::transaction(function () use ($user) {
            $profile = ($this->ensureProfile)($user);
            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            if ($profile->identity_status !== IdentityVerificationStatus::Approved) {
                throw ValidationException::withMessages([
                    'identity' => ['ابتدا باید هویت شما تأیید شود.'],
                ]);
            }

            if ($profile->mobile_ownership_status === MobileOwnershipStatus::Verified) {
                return [
                    'profile' => $profile,
                    'result' => OwnershipVerificationResult::Matched,
                    'attempt' => null,
                    'used_fallback' => false,
                ];
            }

            if ($profile->mobile_ownership_status === MobileOwnershipStatus::Locked || $profile->ownership_locked_at) {
                throw ValidationException::withMessages([
                    'ownership' => ['تطبیق شماره موقتاً قفل شده است. با پشتیبانی تماس بگیرید.'],
                ]);
            }

            $nationalCode = NationalCode::decrypt($profile->national_code_encrypted);
            $mobile = $user->mobile;

            if (! $nationalCode || ! $mobile) {
                throw ValidationException::withMessages([
                    'identity' => ['اطلاعات هویت یا موبایل ناقص است.'],
                ]);
            }

            $outcome = $this->registry->resolveForCapability(
                IdentityCapability::MobileNationalCodeMatch,
                fn ($provider) => $provider->verify($mobile, $nationalCode),
            );

            $result = $outcome['result'];
            $provider = $outcome['provider'];
            $route = $outcome['route'];

            $attemptNumber = (int) IdentityVerificationAttempt::query()
                ->where('user_id', $user->id)
                ->where('capability', IdentityCapability::MobileNationalCodeMatch)
                ->count() + 1;

            $attempt = IdentityVerificationAttempt::query()->create([
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

                return [
                    'profile' => $profile->fresh(),
                    'result' => $result->normalized_result,
                    'attempt' => $attempt,
                    'used_fallback' => $outcome['used_fallback'],
                ];
            }

            if ($result->normalized_result === OwnershipVerificationResult::Mismatched) {
                $profile->mobile_ownership_status = MobileOwnershipStatus::Mismatched;
                $profile->ownership_failed_attempts = (int) $profile->ownership_failed_attempts + 1;
                $profile->save();

                $maxAttempts = (int) config('bahram.identity.ownership_max_attempts', 3);
                if ($profile->ownership_failed_attempts >= $maxAttempts) {
                    ($this->lock)($user, $profile);
                    $this->sms->sendEvent(
                        SmsEventKey::OwnershipVerificationLocked,
                        (string) $user->mobile,
                        ['{name}' => $user->name ?: ($profile->first_name ?? '')],
                        $user->id,
                    );
                } else {
                    $profile->syncVerificationLevel();
                }

                return [
                    'profile' => $profile->fresh(),
                    'result' => $result->normalized_result,
                    'attempt' => $attempt,
                    'used_fallback' => $outcome['used_fallback'],
                ];
            }

            // Technical failures do not increment mismatch attempts.
            $profile->mobile_ownership_status = MobileOwnershipStatus::Pending;
            $profile->save();

            return [
                'profile' => $profile->fresh(),
                'result' => $result->normalized_result,
                'attempt' => $attempt,
                'used_fallback' => $outcome['used_fallback'],
            ];
        });
    }
}
