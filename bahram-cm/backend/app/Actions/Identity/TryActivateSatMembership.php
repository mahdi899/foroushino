<?php

namespace App\Actions\Identity;

use App\Enums\SatApplicationStatus;
use App\Enums\SatMembershipStatus;
use App\Enums\SmsEventKey;
use App\Models\SatApplication;
use App\Models\SatMembership;
use App\Models\User;
use App\Services\SmsService;
use Illuminate\Support\Facades\DB;

class TryActivateSatMembership
{
    public function __construct(
        private readonly EnsureIdentityProfile $ensureProfile,
        private readonly SmsService $sms,
    ) {}

    public function __invoke(User $user): ?SatMembership
    {
        return DB::transaction(function () use ($user) {
            $profile = ($this->ensureProfile)($user);
            $level = (int) $profile->verification_level;

            $accepted = SatApplication::query()
                ->where('user_id', $user->id)
                ->where('status', SatApplicationStatus::Accepted)
                ->exists();

            if (! $accepted || $level < 2) {
                return $user->satMembership;
            }

            $membership = SatMembership::query()->firstOrCreate(
                ['user_id' => $user->id],
                ['status' => SatMembershipStatus::Inactive],
            );

            /** @var SatMembership $membership */
            $membership = SatMembership::query()->whereKey($membership->id)->lockForUpdate()->firstOrFail();

            if ($membership->status === SatMembershipStatus::Active) {
                return $membership;
            }

            $wasInactiveOrSuspended = in_array($membership->status, [
                SatMembershipStatus::Inactive,
                SatMembershipStatus::Suspended,
            ], true);

            $membership->status = SatMembershipStatus::Active;
            $membership->activated_at = now();
            $membership->suspended_at = null;
            $membership->activation_source = 'identity_level2_and_sat_accepted';
            $membership->save();

            if ($wasInactiveOrSuspended && $user->mobile) {
                $this->sms->sendEvent(
                    SmsEventKey::SatMembershipActivated,
                    $user->mobile,
                    ['{name}' => $user->name ?: ($profile->first_name ?? '')],
                    $user->id,
                );
            }

            return $membership;
        });
    }
}
