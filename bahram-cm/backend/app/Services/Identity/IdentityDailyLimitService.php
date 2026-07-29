<?php

namespace App\Services\Identity;

use App\Models\IdentityVerificationSubmission;
use App\Models\User;
use App\Support\IdentityVerificationMessages;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;

/**
 * Daily quotas for identity submits and registry/ownership mismatch attempts.
 */
class IdentityDailyLimitService
{
    public function assertCanSubmit(User $user): void
    {
        if ($this->isMismatchLocked($user)) {
            throw ValidationException::withMessages([
                'identity' => [IdentityVerificationMessages::IDENTITY_MISMATCH_LOCKED],
            ]);
        }

        $max = (int) config('bahram.identity.max_submits_per_day', 2);
        if ($this->submitCountToday($user) >= $max) {
            throw ValidationException::withMessages([
                'identity' => [IdentityVerificationMessages::DAILY_SUBMIT_LIMIT],
            ]);
        }
    }

    public function submitCountToday(User $user): int
    {
        return (int) IdentityVerificationSubmission::query()
            ->where('user_id', $user->id)
            ->whereDate('submitted_at', now()->toDateString())
            ->whereNotNull('submitted_at')
            ->whereIn('status', [
                \App\Enums\IdentityVerificationStatus::Submitted,
                \App\Enums\IdentityVerificationStatus::UnderReview,
                \App\Enums\IdentityVerificationStatus::Approved,
            ])
            ->count();
    }

    public function isMismatchLocked(User $user): bool
    {
        return Cache::has($this->mismatchLockKey($user));
    }

    public function recordMismatch(User $user): int
    {
        $key = $this->mismatchCountKey($user);
        $count = (int) Cache::get($key, 0) + 1;
        Cache::put($key, $count, $this->secondsUntilEndOfDay());

        $max = (int) config('bahram.identity.identity_mismatch_max_attempts', 3);
        if ($count >= $max) {
            Cache::put($this->mismatchLockKey($user), true, $this->secondsUntilEndOfDay());
        }

        return $count;
    }

    public function assertNotMismatchLocked(User $user): void
    {
        if ($this->isMismatchLocked($user)) {
            throw ValidationException::withMessages([
                'identity' => [IdentityVerificationMessages::IDENTITY_MISMATCH_LOCKED],
            ]);
        }
    }

    public function throwMismatch(User $user, ?string $message = null): never
    {
        $count = $this->recordMismatch($user);
        $max = (int) config('bahram.identity.identity_mismatch_max_attempts', 3);

        if ($count >= $max) {
            throw ValidationException::withMessages([
                'identity' => [IdentityVerificationMessages::IDENTITY_MISMATCH_LOCKED],
            ]);
        }

        throw ValidationException::withMessages([
            'identity' => [$message ?? IdentityVerificationMessages::IDENTITY_MISMATCH],
        ]);
    }

    private function mismatchCountKey(User $user): string
    {
        return 'identity-mismatch-count:'.$user->id.':'.now()->toDateString();
    }

    private function mismatchLockKey(User $user): string
    {
        return 'identity-mismatch-lock:'.$user->id.':'.now()->toDateString();
    }

    private function secondsUntilEndOfDay(): int
    {
        return max(60, now()->endOfDay()->diffInSeconds(now()));
    }
}
