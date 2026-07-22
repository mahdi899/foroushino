<?php

namespace App\Services\Sat;

use App\Actions\Identity\TryActivateSatMembership;
use App\Enums\SatApplicationStatus;
use App\Models\SatApplication;
use App\Models\User;

class SatParticipantAccessService
{
    public function __construct(
        private readonly TryActivateSatMembership $activateMembership,
    ) {}

    /**
     * آیا کاربر می‌تواند به گروه تلگرام سات دسترسی بگیرد؟
     * شرط: درخواست توسط مدیریت پذیرفته شده باشد.
     */
    public function hasOpenedAccess(?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        return $this->hasAcceptedApplication($user->id);
    }

    public function hasOpenedAccessByUserId(?int $userId): bool
    {
        if ($userId === null) {
            return false;
        }

        return $this->hasAcceptedApplication($userId);
    }

    public function ensureMembershipActivated(User $user): void
    {
        ($this->activateMembership)($user);
    }

    private function hasAcceptedApplication(int $userId): bool
    {
        return SatApplication::query()
            ->where('user_id', $userId)
            ->where('status', SatApplicationStatus::Accepted)
            ->exists();
    }
}
