<?php

namespace App\Actions\Identity;

use App\Enums\MobileOwnershipStatus;
use App\Enums\SmsEventKey;
use App\Models\User;
use App\Models\UserIdentityProfile;
use App\Services\SmsService;
use Illuminate\Support\Facades\DB;

class LockMobileOwnershipVerification
{
    public function __construct(
        private readonly EnsureIdentityProfile $ensureProfile,
        private readonly SmsService $sms,
    ) {}

    public function __invoke(User $user, ?UserIdentityProfile $profile = null, bool $sendSms = false): UserIdentityProfile
    {
        return DB::transaction(function () use ($user, $profile, $sendSms) {
            $profile ??= ($this->ensureProfile)($user);

            /** @var UserIdentityProfile $profile */
            $profile = UserIdentityProfile::query()->whereKey($profile->id)->lockForUpdate()->firstOrFail();

            $profile->mobile_ownership_status = MobileOwnershipStatus::Locked;
            $profile->ownership_locked_at = now();
            $profile->save();
            $profile->syncVerificationLevel();

            if ($sendSms && $user->mobile) {
                $this->sms->sendEvent(
                    SmsEventKey::OwnershipVerificationLocked,
                    $user->mobile,
                    ['{name}' => $user->name ?: ($profile->first_name ?? '')],
                    $user->id,
                );
            }

            return $profile;
        });
    }
}
