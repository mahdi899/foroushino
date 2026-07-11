<?php

namespace App\Actions\Identity;

use App\Enums\SatMembershipStatus;
use App\Models\SatMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SuspendSatMembership
{
    public function __invoke(User $user, string $source = 'manual'): ?SatMembership
    {
        return DB::transaction(function () use ($user, $source) {
            $membership = $user->satMembership;
            if (! $membership) {
                return null;
            }

            /** @var SatMembership $membership */
            $membership = SatMembership::query()->whereKey($membership->id)->lockForUpdate()->firstOrFail();

            if ($membership->status === SatMembershipStatus::Suspended) {
                return $membership;
            }

            if ($membership->status !== SatMembershipStatus::Active) {
                return $membership;
            }

            $membership->status = SatMembershipStatus::Suspended;
            $membership->suspended_at = now();
            $membership->activation_source = $source;
            $membership->save();

            return $membership;
        });
    }
}
